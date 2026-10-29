import type { Status } from "@/lib/types";

export type BoardTask = { id: string; title: string; status: Status; assignee: string; initials: string; editable?: boolean };
