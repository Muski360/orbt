import "server-only";
import { randomUUID } from "node:crypto";
import { collections, type Project } from "../db.ts";
import { toUserView } from "../views.ts";
import { AppError } from "../errors.ts";
import type { UserView } from "../types.ts";

export async function requireActiveUser(actor: UserView) {
  const { users } = await collections();
  const user = await users.findOne({ _id: actor.id, deleting: false });
  if (!user)
    throw new AppError("Sua sessão não está mais disponível. Entre novamente.");
  return toUserView(user);
}

export async function requireManager(actor: UserView) {
  const user = await requireActiveUser(actor);
  if (user.role !== "manager")
    throw new AppError("Apenas o gerente pode realizar esta operação.");
  return user;
}

export async function getAccessibleProject(
  actor: UserView,
  id: string,
  allowDeleting = false,
) {
  const { projects } = await collections();
  const user = await requireActiveUser(actor);
  const project = await projects.findOne({
    _id: id,
    ...(allowDeleting && user.role === "manager" ? {} : { deleting: false }),
  });
  const permitted =
    project &&
    (user.role === "manager"
      ? project.ownerId === user.id
      : project.memberIds.includes(user.id));
  if (!project || !permitted)
    throw new AppError("Projeto não encontrado ou acesso indisponível.");
  return { project, user };
}

export async function withProjectLock<T>(
  actor: UserView,
  id: string,
  operation: (project: Project, user: UserView) => Promise<T>,
  allowDeleting = false,
) {
  const { project, user } = await getAccessibleProject(
    actor,
    id,
    allowDeleting,
  );
  const { projects } = await collections();
  const token = randomUUID();
  // shortcut: trava de 60 s para operações escolares curtas; usar transações ou renovar a trava para operações longas.
  const locked = await projects.findOneAndUpdate(
    {
      _id: project._id,
      ...(user.role === "manager"
        ? { ownerId: user.id }
        : { memberIds: user.id }),
      ...(allowDeleting ? {} : { deleting: false }),
      $or: [
        { lockUntil: { $exists: false } },
        { lockUntil: { $lt: new Date() } },
      ],
    },
    { $set: { lockToken: token, lockUntil: new Date(Date.now() + 60_000) } },
    { returnDocument: "after" },
  );
  if (!locked)
    throw new AppError(
      "O projeto está sendo atualizado. Tente novamente em instantes.",
    );
  try {
    return await operation(locked, user);
  } finally {
    await projects.updateOne(
      { _id: id, lockToken: token },
      { $unset: { lockToken: "", lockUntil: "" } },
    );
  }
}

export function requireProjectOwner(project: Project, user: UserView) {
  if (user.role !== "manager" || project.ownerId !== user.id)
    throw new AppError(
      "Apenas o gerente deste projeto pode realizar esta operação.",
    );
}
