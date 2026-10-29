"use client";

import Link from "next/link";
import { useState } from "react";
import { moveTaskAction } from "@/app/actions";
import type {
  MemberView,
  PersonView,
  ProjectView,
  TaskView,
} from "@/lib/types";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ProjectMembers } from "./project-members";
import { TaskDialog } from "./task-dialog";
import { RefreshButton } from "./refresh-button";
import styles from "./workspace.module.css";

export function ProjectWorkspace({
  project,
  people,
  tasks,
  members,
  manager,
}: {
  project: ProjectView;
  people: PersonView[];
  tasks: TaskView[];
  members: MemberView[];
  manager: boolean;
}) {
  const [editor, setEditor] = useState<string | null>(null);
  const selected = tasks.find((task) => task.id === editor) ?? null;
  return (
    <>
      <Link className={styles.backLink} href="/projetos">
        ← Todos os projetos
      </Link>
      <header className={styles.pageHeader}>
        <div>
          <h1>{project.name}</h1>
          {project.description && <p>{project.description}</p>}
        </div>
        <button
          className={styles.primaryButton}
          onClick={() => setEditor("new")}
        >
          Criar tarefa <span aria-hidden="true">+</span>
        </button>
      </header>
      <div className={styles.projectToolbar}>
        <ProjectMembers
          project={project}
          people={people}
          members={members}
          manager={manager}
        />
        <RefreshButton />
      </div>
      <KanbanBoard
        title="O trabalho em movimento"
        fullSize
        tasks={tasks}
        onOpenTask={setEditor}
        onMove={async (id, status) => {
          const form = new FormData();
          form.set("id", id);
          form.set("projectId", project.id);
          form.set("status", status);
          return moveTaskAction({ ok: false }, form);
        }}
      />
      <TaskDialog
        open={!!editor}
        creating={editor === "new"}
        task={selected}
        projectId={project.id}
        people={people}
        onClose={() => setEditor(null)}
      />
    </>
  );
}
