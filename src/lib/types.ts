export const statuses = [
  { id: "todo", label: "A Fazer" },
  { id: "doing", label: "Em Andamento" },
  { id: "done", label: "Concluído" },
] as const;
export type Status = (typeof statuses)[number]["id"];
export type UserView = {
  id: string;
  name: string;
  email: string;
  role: "manager" | "member";
};
export type MemberView = UserView & { deleting: boolean };
export type ProjectView = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  pendingRemovalIds: string[];
  deleting: boolean;
};
export type PersonView = { id: string; name: string };
export type TaskCardData = {
  id: string;
  title: string;
  status: Status;
  assignee: string;
  initials: string;
  editable?: boolean;
};
export type TaskView = TaskCardData & {
  description: string;
  projectId: string;
  assigneeId: string | null;
  editable: boolean;
};
export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error?: string; fields?: Record<string, string> };
