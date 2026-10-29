"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { demoTasks } from "./kanban-demo";

export function KanbanPreview() {
  const [tasks, setTasks] = useState(demoTasks);
  return <KanbanBoard title="Projeto de lançamento" tasks={tasks}
    onReset={() => setTasks(demoTasks)}
    onMove={(id, status) => {
      setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
      return { ok: true };
    }} />;
}
