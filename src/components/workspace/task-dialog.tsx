"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTaskAction, updateTaskAction, deleteTaskAction } from "@/app/actions";
import { statuses, type PersonView, type TaskView } from "@/lib/types";
import { ActionForm, TextField } from "./form";
import { Dialog } from "./dialog";
import styles from "./workspace.module.css";

export function TaskDialog({ open, task, projectId, people, onClose }: { open: boolean; task: TaskView | null; projectId: string; people: PersonView[]; onClose: () => void }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const readonly = !!task && !task.editable;
  const finish = () => { setConfirming(false); onClose(); router.refresh(); };
  return <>
    <Dialog open={open} onClose={onClose} title={task ? "Detalhes da tarefa" : "Criar tarefa"}>
      {readonly ? <><h3>{task.title}</h3><p>{task.description || "Sem descrição."}</p><p><strong>Responsável:</strong> {task.assignee}</p><p><strong>Status:</strong> {statuses.find((status) => status.id === task.status)?.label}</p><p className={styles.meta}>Somente o responsável e o gerente podem alterar esta tarefa.</p></> : <ActionForm action={task ? updateTaskAction : createTaskAction} submit={task ? "Salvar alterações" : "Criar tarefa"} onSuccess={finish}>
        <input type="hidden" name="projectId" value={projectId} />{task && <input type="hidden" name="id" value={task.id} />}
        <TextField name="title" label="Título" defaultValue={task?.title} required />
        <TextField name="description" label="Descrição" defaultValue={task?.description} multiline />
        <div className={styles.field}><label htmlFor="task-assignee">Responsável</label><select id="task-assignee" name="assigneeId" defaultValue={task?.assigneeId ?? ""}><option value="">Sem responsável</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div>
        {!task && <p className={styles.meta}>A tarefa começa em A Fazer. Sem responsável, apenas o gerente poderá alterá-la.</p>}
      </ActionForm>}
      {task?.editable && <button className={styles.textButton} onClick={() => setConfirming(true)}>Excluir tarefa</button>}
    </Dialog>
    <Dialog open={confirming && open} onClose={() => setConfirming(false)} title="Excluir tarefa">
      <p>Excluir <strong>{task?.title}</strong>? Esta ação não pode ser desfeita.</p>
      <ActionForm action={deleteTaskAction} submit="Confirmar exclusão" danger onSuccess={finish}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="id" value={task?.id ?? ""} /></ActionForm>
    </Dialog>
  </>;
}
