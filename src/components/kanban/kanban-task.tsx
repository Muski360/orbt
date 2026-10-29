"use client";

import { useDraggable } from "@dnd-kit/react";
import { motion } from "motion/react";
import { statuses, type Status } from "@/lib/types";
import type { BoardTask } from "./types";
import styles from "./kanban-preview.module.css";

type Props = {
  task: BoardTask;
  reducedMotion: boolean | null;
  onMove: (id: string, status: Status) => void;
  busy: boolean;
  onOpenTask?: (id: string) => void;
};

export function KanbanTask({ task, reducedMotion, onMove, busy, onOpenTask }: Props) {
  const { ref, handleRef, isDragSource } = useDraggable({
    id: task.id, type: "task", data: { title: task.title }, disabled: busy || task.editable === false,
  });

  return (
    <motion.div
      layout={reducedMotion ? false : "position"}
      layoutId={reducedMotion ? undefined : task.id}
      initial={false}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={styles.taskSlot}
    >
      <article
        ref={ref}
        className={styles.task}
        data-task={task.id}
        data-dragging={isDragSource || undefined}
      >
        <div className={styles.taskHeading}>
          <h4>{onOpenTask ? <button className={styles.taskTitleButton} type="button" onClick={() => onOpenTask(task.id)} aria-label={`Ver tarefa ${task.title}`}>{task.title}</button> : task.title}</h4>
          <button
            ref={handleRef}
            data-drag-handle
            type="button"
            className={styles.dragHandle}
            aria-label={`Arrastar ${task.title}`}
            disabled={busy || task.editable === false}
          >
            <span aria-hidden="true">⠿</span>
          </button>
        </div>
        <div className={styles.taskFooter}>
          <span className={styles.assignee} title={task.assignee}>
            <span className={styles.avatar} aria-hidden="true">{task.initials}</span>
            <span>{task.assignee}</span>
          </span>
          <select
            className={styles.statusSelect}
            aria-label={`Status de ${task.title}`}
            value={task.status}
            disabled={busy || task.editable === false}
            onChange={(event) => {
              const status = statuses.find((column) => column.id === event.target.value);
              if (status) onMove(task.id, status.id);
            }}
          >
            {statuses.map((column) => (
              <option key={column.id} value={column.id}>{column.label}</option>
            ))}
          </select>
        </div>
      </article>
    </motion.div>
  );
}
