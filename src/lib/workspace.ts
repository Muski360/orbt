import "server-only";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { collections, type Project, type Task } from "./db.ts";
import { userView } from "./session.ts";
import { AppError } from "./errors.ts";
import type { UserView, ProjectView, MemberView, TaskView, Status } from "./types.ts";

async function activeUser(actor: UserView) {
  const user = await (await collections()).users.findOne({ _id: actor.id, deleting: false });
  if (!user) throw new AppError("Sua sessão não está mais disponível. Entre novamente.");
  return userView(user);
}

async function manager(actor: UserView) {
  const user = await activeUser(actor);
  if (user.role !== "manager") throw new AppError("Apenas o gerente pode realizar esta operação.");
  return user;
}

function projectView(project: Project): ProjectView {
  return { id: project._id, name: project.name, description: project.description, ownerId: project.ownerId, memberIds: project.memberIds, pendingRemovalIds: project.pendingRemovalIds ?? [], deleting: project.deleting };
}

async function accessibleProject(actor: UserView, id: string, allowDeleting = false) {
  const { projects } = await collections();
  const user = await activeUser(actor);
  const project = await projects.findOne({ _id: id, ...(allowDeleting ? {} : { deleting: false }) });
  const permitted = project && (user.role === "manager" ? project.ownerId === user.id : project.memberIds.includes(user.id));
  if (!project || !permitted) throw new AppError("Projeto não encontrado ou acesso indisponível.");
  return { project, user };
}

async function withProject<T>(actor: UserView, id: string, operation: (project: Project, user: UserView) => Promise<T>, allowDeleting = false) {
  const { project, user } = await accessibleProject(actor, id, allowDeleting);
  const { projects } = await collections();
  const token = randomUUID();
  // shortcut: trava de 60 s para operações escolares curtas; usar transações ou renovar a trava para operações longas.
  const locked = await projects.findOneAndUpdate({
    _id: project._id,
    ...(user.role === "manager" ? { ownerId: user.id } : { memberIds: user.id }),
    ...(allowDeleting ? {} : { deleting: false }),
    $or: [{ lockUntil: { $exists: false } }, { lockUntil: { $lt: new Date() } }],
  }, { $set: { lockToken: token, lockUntil: new Date(Date.now() + 60_000) } }, { returnDocument: "after" });
  if (!locked) throw new AppError("O projeto está sendo atualizado. Tente novamente em instantes.");
  try { return await operation(locked, user); }
  finally { await projects.updateOne({ _id: id, lockToken: token }, { $unset: { lockToken: "", lockUntil: "" } }); }
}

function requireOwner(project: Project, user: UserView) {
  if (user.role !== "manager" || project.ownerId !== user.id) throw new AppError("Apenas o gerente deste projeto pode realizar esta operação.");
}

async function validateAssignee(project: Project, assigneeId: string | null) {
  if (!assigneeId) return;
  if (assigneeId !== project.ownerId && !project.memberIds.includes(assigneeId)) throw new AppError("O responsável deve participar do projeto.");
  const user = await (await collections()).users.findOne({ _id: assigneeId, deleting: false });
  if (!user) throw new AppError("Este responsável não está disponível.");
}

async function editableTask(project: Project, user: UserView, id: string) {
  const task = await (await collections()).tasks.findOne({ _id: id, projectId: project._id });
  if (!task || (user.role !== "manager" && task.assigneeId !== user.id)) throw new AppError("Você só pode alterar tarefas atribuídas a você.");
  return task;
}

export async function listProjects(actor: UserView) {
  const user = await activeUser(actor);
  const query = user.role === "manager" ? { ownerId: user.id } : { memberIds: user.id, deleting: false };
  return (await (await collections()).projects.find(query).sort({ createdAt: -1, _id: 1 }).toArray()).map(projectView);
}

export async function listMembers(actor: UserView): Promise<MemberView[]> {
  const user = await manager(actor);
  return (await (await collections()).users.find({ createdBy: user.id, role: "member" }).sort({ name: 1 }).toArray())
    .map((member) => ({ ...userView(member), deleting: member.deleting }));
}

export async function projectDetail(actor: UserView, id: string) {
  const { project, user } = await accessibleProject(actor, id, actor.role === "manager");
  const { users, tasks } = await collections();
  const participants = await users.find({ _id: { $in: [project.ownerId, ...project.memberIds] }, deleting: false }).toArray();
  const people = participants.map((person) => ({ id: person._id, name: person.name }));
  const activeIds = new Set(people.map((person) => person.id));
  const items: TaskView[] = (await tasks.find({ projectId: id }).sort({ createdAt: 1, _id: 1 }).toArray()).map((task) => {
    const person = participants.find((member) => member._id === task.assigneeId);
    return { id: task._id, title: task.title, description: task.description, projectId: id, status: task.status,
      assigneeId: task.assigneeId && activeIds.has(task.assigneeId) ? task.assigneeId : null,
      assignee: person?.name ?? "Sem responsável",
      initials: person ? person.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() : "—",
      editable: !project.deleting && (user.role === "manager" || task.assigneeId === user.id),
    };
  });
  return { project: projectView(project), people, tasks: items };
}

export async function createProject(actor: UserView, input: { name: string; description: string }) {
  const user = await manager(actor);
  const id = randomUUID();
  await (await collections()).projects.insertOne({ _id: id, ...input, ownerId: user.id, memberIds: [], pendingRemovalIds: [], deleting: false, createdAt: new Date() });
  return id;
}

export async function updateProject(actor: UserView, input: { id: string; name: string; description: string }) {
  await withProject(actor, input.id, async (project, user) => {
    requireOwner(project, user);
    await (await collections()).projects.updateOne({ _id: project._id }, { $set: { name: input.name, description: input.description } });
  });
}

export async function deleteProject(actor: UserView, id: string) {
  await manager(actor);
  await withProject(actor, id, async (project, user) => {
    requireOwner(project, user);
    const db = await collections();
    await db.projects.updateOne({ _id: id }, { $set: { deleting: true } });
    await db.tasks.deleteMany({ projectId: id });
    await db.projects.deleteOne({ _id: id });
  }, true);
}

export async function createMember(actor: UserView, input: { name: string; email: string; password: string }) {
  const user = await manager(actor);
  await (await collections()).users.insertOne({ _id: randomUUID(), name: input.name, email: input.email,
    passwordHash: await hash(input.password, 12), role: "member", createdBy: user.id, deleting: false, createdAt: new Date() });
}

export async function addMember(actor: UserView, projectId: string, memberId: string) {
  await withProject(actor, projectId, async (project, user) => {
    requireOwner(project, user);
    const db = await collections();
    if (!await db.users.findOne({ _id: memberId, createdBy: user.id, role: "member", deleting: false })) throw new AppError("Membro não encontrado.");
    if (project.pendingRemovalIds?.includes(memberId)) throw new AppError("Conclua a retirada deste membro antes de associá-lo novamente.");
    await db.projects.updateOne({ _id: projectId }, { $addToSet: { memberIds: memberId } });
  });
}

async function clearMembership(project: Project, memberId: string) {
  const db = await collections();
  await db.projects.updateOne({ _id: project._id }, { $pull: { memberIds: memberId }, $addToSet: { pendingRemovalIds: memberId } });
  await db.tasks.updateMany({ projectId: project._id, assigneeId: memberId }, { $set: { assigneeId: null } });
  await db.projects.updateOne({ _id: project._id }, { $pull: { pendingRemovalIds: memberId } });
}

export async function removeMember(actor: UserView, projectId: string, memberId: string) {
  await withProject(actor, projectId, async (project, user) => {
    requireOwner(project, user);
    if (memberId === project.ownerId) throw new AppError("O proprietário não pode ser retirado.");
    if (!project.memberIds.includes(memberId) && !project.pendingRemovalIds?.includes(memberId)) throw new AppError("Membro não encontrado neste projeto.");
    await clearMembership(project, memberId);
  });
}

export async function deleteMember(actor: UserView, id: string) {
  const user = await manager(actor);
  const db = await collections();
  const member = await db.users.findOne({ _id: id, createdBy: user.id, role: "member" });
  if (!member) throw new AppError("Membro não encontrado.");
  await db.users.updateOne({ _id: id, createdBy: user.id }, { $set: { deleting: true } });
  await db.sessions.deleteMany({ userId: id });
  const projects = await db.projects.find({ ownerId: user.id }).toArray();
  for (const project of projects) {
    await withProject(user, project._id, async (locked) => { await clearMembership(locked, id); }, true);
  }
  await db.users.deleteOne({ _id: id, createdBy: user.id, role: "member", deleting: true });
}

type TaskInput = Pick<Task, "title" | "description" | "projectId" | "assigneeId">;

export async function createTask(actor: UserView, input: TaskInput) {
  await withProject(actor, input.projectId, async (project) => {
    await validateAssignee(project, input.assigneeId);
    await (await collections()).tasks.insertOne({ _id: randomUUID(), ...input, status: "todo", createdAt: new Date() });
  });
}

export async function updateTask(actor: UserView, input: TaskInput & { id: string }) {
  await withProject(actor, input.projectId, async (project, user) => {
    await editableTask(project, user, input.id);
    await validateAssignee(project, input.assigneeId);
    await (await collections()).tasks.updateOne({ _id: input.id, projectId: input.projectId }, { $set: { title: input.title, description: input.description, assigneeId: input.assigneeId } });
  });
}

export async function moveTask(actor: UserView, projectId: string, id: string, status: Status) {
  await withProject(actor, projectId, async (project, user) => {
    await editableTask(project, user, id);
    await (await collections()).tasks.updateOne({ _id: id, projectId }, { $set: { status } });
  });
}

export async function deleteTask(actor: UserView, projectId: string, id: string) {
  await withProject(actor, projectId, async (project, user) => {
    await editableTask(project, user, id);
    await (await collections()).tasks.deleteOne({ _id: id, projectId });
  });
}
