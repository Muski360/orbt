import "server-only";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { collections, type Project } from "../db.ts";
import { toUserView } from "../views.ts";
import { AppError } from "../errors.ts";
import type { UserView, MemberView } from "../types.ts";
import {
  requireManager,
  withProjectLock,
  requireProjectOwner,
} from "./access.ts";

export async function listMembers(actor: UserView): Promise<MemberView[]> {
  const user = await requireManager(actor);
  const { users } = await collections();
  const members = await users
    .find({ createdBy: user.id, role: "member" })
    .sort({ name: 1 })
    .toArray();
  return members.map((member) => ({
    ...toUserView(member),
    deleting: member.deleting,
  }));
}

export async function createMember(
  actor: UserView,
  input: { name: string; email: string; password: string },
) {
  const user = await requireManager(actor);
  const { users } = await collections();
  await users.insertOne({
    _id: randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash: await hash(input.password, 12),
    role: "member",
    createdBy: user.id,
    deleting: false,
    createdAt: new Date(),
  });
}

export async function addMember(
  actor: UserView,
  projectId: string,
  memberId: string,
) {
  await withProjectLock(actor, projectId, async (project, user) => {
    requireProjectOwner(project, user);
    const db = await collections();
    if (
      !(await db.users.findOne({
        _id: memberId,
        createdBy: user.id,
        role: "member",
        deleting: false,
      }))
    )
      throw new AppError("Membro não encontrado.");
    if (project.pendingRemovalIds?.includes(memberId))
      throw new AppError(
        "Conclua a retirada deste membro antes de associá-lo novamente.",
      );
    await db.projects.updateOne(
      { _id: projectId },
      { $addToSet: { memberIds: memberId } },
    );
  });
}

async function clearMembership(project: Project, memberId: string) {
  const db = await collections();
  await db.projects.updateOne(
    { _id: project._id },
    {
      $pull: { memberIds: memberId },
      $addToSet: { pendingRemovalIds: memberId },
    },
  );
  await db.tasks.updateMany(
    { projectId: project._id, assigneeId: memberId },
    { $set: { assigneeId: null } },
  );
  await db.projects.updateOne(
    { _id: project._id },
    { $pull: { pendingRemovalIds: memberId } },
  );
}

export async function removeMember(
  actor: UserView,
  projectId: string,
  memberId: string,
) {
  await withProjectLock(actor, projectId, async (project, user) => {
    requireProjectOwner(project, user);
    if (memberId === project.ownerId)
      throw new AppError("O proprietário não pode ser retirado.");
    if (
      !project.memberIds.includes(memberId) &&
      !project.pendingRemovalIds?.includes(memberId)
    )
      throw new AppError("Membro não encontrado neste projeto.");
    await clearMembership(project, memberId);
  });
}

export async function deleteMember(actor: UserView, id: string) {
  const user = await requireManager(actor);
  const db = await collections();
  const member = await db.users.findOne({
    _id: id,
    createdBy: user.id,
    role: "member",
  });
  if (!member) throw new AppError("Membro não encontrado.");
  await db.users.updateOne(
    { _id: id, createdBy: user.id },
    { $set: { deleting: true } },
  );
  await db.sessions.deleteMany({ userId: id });
  const projects = await db.projects.find({ ownerId: user.id }).toArray();
  for (const project of projects) {
    await withProjectLock(
      user,
      project._id,
      async (locked) => {
        await clearMembership(locked, id);
      },
      true,
    );
  }
  await db.users.deleteOne({
    _id: id,
    createdBy: user.id,
    role: "member",
    deleting: true,
  });
}
