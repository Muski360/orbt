"use client";

import { useDraggable } from "@dnd-kit/react";
import { motion } from "motion/react";
import type { Status } from "@/lib/types";
import type { TaskCardData } from "@/lib/types";
import { TaskCardContent } from "./task-card-content";
import styles from "./kanban-preview.module.css";

type Props = {
  task: TaskCardData;
  reducedMotion: boolean | null;
  onMove: (id: string, status: Status) => void;
  busy: boolean;
  saving: boolean;
  onOpenTask?: (id: string) => void;
};

export function KanbanTask({
  task,
  reducedMotion,
  onMove,
  busy,
  saving,
  onOpenTask,
}: Props) {
  const { ref, handleRef, isDragSource } = useDraggable({
    id: task.id,
    type: "task",
    data: { title: task.title },
    disabled: busy || task.editable === false,
  });

  return (
    <motion.div
      layout={reducedMotion ? false : "position"}
      initial={false}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={styles.taskSlot}
    >
      <article
        ref={ref}
        className={styles.task}
        data-task={task.id}
        data-dragging={isDragSource || undefined}
        data-saving={saving || undefined}
        aria-busy={saving}
      >
        <TaskCardContent
          task={task}
          handleRef={handleRef}
          busy={busy}
          saving={saving}
          onMove={onMove}
          onOpenTask={onOpenTask}
        />
      </article>
    </motion.div>
  );
}
