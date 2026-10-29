"use client";

import { useDragOperation, useDroppable } from "@dnd-kit/react";
import { statuses, type Status } from "@/lib/types";
import type { TaskCardData } from "@/lib/types";
import { KanbanTask } from "./kanban-task";
import styles from "./kanban-preview.module.css";

type Props = {
  column: (typeof statuses)[number];
  tasks: TaskCardData[];
  reducedMotion: boolean | null;
  onMove: (id: string, status: Status) => void;
  busy: boolean;
  savingId: string | null;
  onOpenTask?: (id: string) => void;
};

export function KanbanColumn({
  column,
  tasks,
  reducedMotion,
  onMove,
  busy,
  savingId,
  onOpenTask,
}: Props) {
  const { ref, isDropTarget } = useDroppable({
    id: column.id,
    accept: "task",
    data: { label: column.label },
    disabled: busy,
  });
  const { source } = useDragOperation();
  const destination =
    isDropTarget && !tasks.some((task) => task.id === source?.id);

  return (
    <section
      ref={ref}
      className={styles.column}
      data-column={column.id}
      data-over={destination || undefined}
      aria-labelledby={`column-${column.id}`}
    >
      <div className={styles.columnHeader}>
        <h3 id={`column-${column.id}`}>
          <span className={styles.marker} aria-hidden="true" />
          {column.label}
        </h3>
        <span className={styles.count}>
          {String(tasks.length).padStart(2, "0")}
        </span>
      </div>
      <div className={styles.columnTasks}>
        {tasks.map((task) => (
          <KanbanTask
            key={task.id}
            task={task}
            reducedMotion={reducedMotion}
            onMove={onMove}
            busy={busy}
            saving={savingId === task.id}
            onOpenTask={onOpenTask}
          />
        ))}
        {destination && (
          <div className={styles.dropHint} aria-hidden="true">
            <span>↓</span>Soltar em {column.label}
          </div>
        )}
        {tasks.length === 0 && !destination && (
          <p className={styles.emptyColumn}>Espaço para o próximo passo.</p>
        )}
      </div>
    </section>
  );
}
