import "server-only";
import type { User, Project } from "./db.ts";
import type { UserView, ProjectView } from "./types.ts";

export function toUserView(
  user: Pick<User, "_id" | "name" | "email" | "role">,
): UserView {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

export function toProjectView(project: Project): ProjectView {
  return {
    id: project._id,
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    memberIds: project.memberIds,
    pendingRemovalIds: project.pendingRemovalIds ?? [],
    deleting: project.deleting,
  };
}
