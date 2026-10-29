import type { Ref } from "react";
import { statuses, type Status } from "@/lib/types";
import { Spinner } from "@/components/ui/loading-indicator";
import type { TaskCardData } from "@/lib/types";
import styles from "./kanban-preview.module.css";

export function TaskCardContent({
  task,
  handleRef,
  busy = false,
  saving = false,
  onOpenTask,
  onMove,
}: {
  task: TaskCardData;
  handleRef?: Ref<HTMLButtonElement>;
  busy?: boolean;
  saving?: boolean;
  onOpenTask?: (id: string) => void;
  onMove?: (id: string, status: Status) => void;
}) {
  return (
    <>
      <div className={styles.taskHeading}>
        <h4>
          {onOpenTask ? (
            <button
              className={styles.taskTitleButton}
              type="button"
              onClick={() => onOpenTask(task.id)}
              aria-label={`Ver tarefa ${task.title}`}
            >
              {task.title}
            </button>
          ) : (
            task.title
          )}
        </h4>
        <button
          ref={handleRef}
          data-drag-handle
          data-drag-grip
          type="button"
          className={styles.dragHandle}
          aria-label={`Arrastar ${task.title}`}
          disabled={!onMove || busy || task.editable === false}
        >
          {saving ? (
            <Spinner />
          ) : (
            <svg
              width="20"
              height="24"
              viewBox="0 0 20 24"
              fill="currentColor"
              aria-hidden="true"
            >
              {[5, 12, 19].map((y) => (
                <g key={y}>
                  <circle cx="6" cy={y} r="1.75" />
                  <circle cx="14" cy={y} r="1.75" />
                </g>
              ))}
            </svg>
          )}
        </button>
      </div>
      <div className={styles.taskFooter}>
        <span className={styles.assignee} title={task.assignee}>
          <span className={styles.avatar} aria-hidden="true">
            {task.initials}
          </span>
          <span>{task.assignee}</span>
        </span>
        <select
          className={styles.statusSelect}
          aria-label={`Status de ${task.title}`}
          value={task.status}
          disabled={!onMove || busy || task.editable === false}
          onChange={(event) => {
            const status = statuses.find(
              (column) => column.id === event.target.value,
            );
            if (status) onMove?.(task.id, status.id);
          }}
        >
          {statuses.map((column) => (
            <option key={column.id} value={column.id}>
              {column.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
