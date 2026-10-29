"use client";

import { useDroppable } from "@dnd-kit/react";
import { statuses, type Status } from "@/lib/types";
import type { BoardTask } from "./types";
import { KanbanTask } from "./kanban-task";
import styles from "./kanban-preview.module.css";

type Props = {
  column: (typeof statuses)[number];
  tasks: BoardTask[];
  reducedMotion: boolean | null;
  onMove: (id: string, status: Status) => void;
  busy: boolean;
  onOpenTask?: (id: string) => void;
};

export function KanbanColumn({ column, tasks, reducedMotion, onMove, busy, onOpenTask }: Props) {
  const { ref, isDropTarget } = useDroppable({
    id: column.id, accept: "task", data: { label: column.label }, disabled: busy,
  });

  return (
    <section
      ref={ref}
      className={styles.column}
      data-column={column.id}
      data-over={isDropTarget || undefined}
      aria-labelledby={`column-${column.id}`}
    >
      <div className={styles.columnHeader}>
        <h3 id={`column-${column.id}`}>
          <span className={styles.marker} aria-hidden="true" />
          {column.label}
        </h3>
        <span className={styles.count}>{String(tasks.length).padStart(2, "0")}</span>
      </div>
      <div className={styles.columnTasks}>
        {tasks.map((task) => (
          <KanbanTask key={task.id} task={task} reducedMotion={reducedMotion} onMove={onMove} busy={busy} onOpenTask={onOpenTask} />
        ))}
        {tasks.length === 0 && <p className={styles.emptyColumn}>Espaço para o próximo passo.</p>}
      </div>
    </section>
  );
}
