import type { BoardTask } from "@/components/kanban/types";
export type DemoTask = BoardTask;

export const demoTasks: DemoTask[] = [
  { id: "idea", title: "Tirar a ideia do papel", assignee: "Você", initials: "VC", status: "todo" },
  { id: "references", title: "Reunir as referências", assignee: "Ana", initials: "AN", status: "todo" },
  { id: "identity", title: "Criar a identidade visual", assignee: "Leo", initials: "LE", status: "doing" },
  { id: "team", title: "Colocar o time na mesma órbita", assignee: "Bia", initials: "BI", status: "done" },
];
