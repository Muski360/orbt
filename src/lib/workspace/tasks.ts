import "server-only";
import { randomUUID } from "node:crypto";
import { collections, type Project, type Task } from "../db.ts";
import { AppError } from "../errors.ts";
import type { UserView, Status } from "../types.ts";
import { withProjectLock } from "./access.ts";

async function validateAssignee(project: Project, assigneeId: string | null) {
  if (!assigneeId) return;
  if (assigneeId !== project.ownerId && !project.memberIds.includes(assigneeId))
    throw new AppError("O responsável deve participar do projeto.");
  const { users } = await collections();
  const user = await users.findOne({ _id: assigneeId, deleting: false });
  if (!user) throw new AppError("Este responsável não está disponível.");
}

async function editableTask(project: Project, user: UserView, id: string) {
  const { tasks } = await collections();
  const task = await tasks.findOne({ _id: id, projectId: project._id });
  if (!task || (user.role !== "manager" && task.assigneeId !== user.id))
    throw new AppError("Você só pode alterar tarefas atribuídas a você.");
  return task;
}

type TaskInput = Pick<
  Task,
  "title" | "description" | "projectId" | "assigneeId"
>;

export async function createTask(actor: UserView, input: TaskInput) {
  await withProjectLock(actor, input.projectId, async (project) => {
    await validateAssignee(project, input.assigneeId);
    const { tasks } = await collections();
    await tasks.insertOne({
      _id: randomUUID(),
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      assigneeId: input.assigneeId,
      status: "todo",
      createdAt: new Date(),
    });
  });
}

export async function updateTask(
  actor: UserView,
  input: TaskInput & { id: string },
) {
  await withProjectLock(actor, input.projectId, async (project, user) => {
    await editableTask(project, user, input.id);
    await validateAssignee(project, input.assigneeId);
    const { tasks } = await collections();
    await tasks.updateOne(
      { _id: input.id, projectId: input.projectId },
      {
        $set: {
          title: input.title,
          description: input.description,
          assigneeId: input.assigneeId,
        },
      },
    );
  });
}

export async function moveTask(
  actor: UserView,
  projectId: string,
  id: string,
  status: Status,
) {
  await withProjectLock(actor, projectId, async (project, user) => {
    await editableTask(project, user, id);
    const { tasks } = await collections();
    await tasks.updateOne({ _id: id, projectId }, { $set: { status } });
  });
}

export async function deleteTask(
  actor: UserView,
  projectId: string,
  id: string,
) {
  await withProjectLock(actor, projectId, async (project, user) => {
    await editableTask(project, user, id);
    const { tasks } = await collections();
    await tasks.deleteOne({ _id: id, projectId });
  });
}
