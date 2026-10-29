import "server-only";
import { randomUUID } from "node:crypto";
import { collections } from "../db.ts";
import { toProjectView } from "../views.ts";
import type { UserView, TaskView } from "../types.ts";
import { getInitials } from "../format.ts";
import {
  requireActiveUser,
  requireManager,
  getAccessibleProject,
  withProjectLock,
  requireProjectOwner,
} from "./access.ts";

export async function listProjects(actor: UserView) {
  const user = await requireActiveUser(actor);
  const query =
    user.role === "manager"
      ? { ownerId: user.id }
      : { memberIds: user.id, deleting: false };
  const { projects } = await collections();
  const results = await projects
    .find(query)
    .sort({ createdAt: -1, _id: 1 })
    .toArray();
  return results.map(toProjectView);
}

export async function projectDetail(actor: UserView, id: string) {
  const { project, user } = await getAccessibleProject(actor, id, true);
  if (project.deleting)
    return { project: toProjectView(project), people: [], tasks: [] };
  const { users, tasks } = await collections();
  const participants = await users
    .find({
      _id: { $in: [project.ownerId, ...project.memberIds] },
      deleting: false,
    })
    .toArray();
  const people = participants.map((person) => ({
    id: person._id,
    name: person.name,
  }));
  const peopleById = new Map(
    participants.map((person) => [person._id, person]),
  );
  const items: TaskView[] = (
    await tasks.find({ projectId: id }).sort({ createdAt: 1, _id: 1 }).toArray()
  ).map((task) => {
    const person = task.assigneeId
      ? peopleById.get(task.assigneeId)
      : undefined;
    return {
      id: task._id,
      title: task.title,
      description: task.description,
      projectId: id,
      status: task.status,
      assigneeId: person?._id ?? null,
      assignee: person?.name ?? "Sem responsável",
      initials: person ? getInitials(person.name) : "—",
      editable:
        !project.deleting &&
        (user.role === "manager" || task.assigneeId === user.id),
    };
  });
  return { project: toProjectView(project), people, tasks: items };
}

export async function createProject(
  actor: UserView,
  input: { name: string; description: string },
) {
  const user = await requireManager(actor);
  const id = randomUUID();
  const { projects } = await collections();
  await projects.insertOne({
    _id: id,
    name: input.name,
    description: input.description,
    ownerId: user.id,
    memberIds: [],
    pendingRemovalIds: [],
    deleting: false,
    createdAt: new Date(),
  });
  return id;
}

export async function updateProject(
  actor: UserView,
  input: { id: string; name: string; description: string },
) {
  await withProjectLock(actor, input.id, async (project, user) => {
    requireProjectOwner(project, user);
    const { projects } = await collections();
    await projects.updateOne(
      { _id: project._id },
      { $set: { name: input.name, description: input.description } },
    );
  });
}

export async function deleteProject(actor: UserView, id: string) {
  await requireManager(actor);
  await withProjectLock(
    actor,
    id,
    async (project, user) => {
      requireProjectOwner(project, user);
      const db = await collections();
      await db.projects.updateOne({ _id: id }, { $set: { deleting: true } });
      await db.tasks.deleteMany({ projectId: id });
      await db.projects.deleteOne({ _id: id });
    },
    true,
  );
}
