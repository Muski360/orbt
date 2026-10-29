"use client";

import { useState } from "react";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from "@/app/actions";
import { statuses, type PersonView, type TaskView } from "@/lib/types";
import { ActionForm, TextField, SelectField } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import styles from "./workspace.module.css";

export function TaskDialog({
  open,
  creating,
  task,
  projectId,
  people,
  onClose,
}: {
  open: boolean;
  creating: boolean;
  task: TaskView | null;
  projectId: string;
  people: PersonView[];
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const readonly = !!task && !task.editable;
  const unavailable = !creating && !task;
  const finish = () => {
    setConfirming(false);
    onClose();
  };
  return (
    <>
      <Dialog
        open={open}
        onClose={finish}
        title={
          creating
            ? "Criar tarefa"
            : unavailable
              ? "Tarefa indisponível"
              : "Detalhes da tarefa"
        }
      >
        {unavailable ? (
          <p role="alert">
            Esta tarefa foi removida ou não está mais disponível. Feche os
            detalhes para continuar.
          </p>
        ) : readonly ? (
          <>
            <h3>{task.title}</h3>
            <p>{task.description || "Sem descrição."}</p>
            <p>
              <strong>Responsável:</strong> {task.assignee}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {statuses.find((status) => status.id === task.status)?.label}
            </p>
            <p className={styles.meta}>
              Somente o responsável e o gerente podem alterar esta tarefa.
            </p>
          </>
        ) : (
          <ActionForm
            action={task ? updateTaskAction : createTaskAction}
            submit={task ? "Salvar alterações" : "Criar tarefa"}
            onSuccess={finish}
          >
            <input type="hidden" name="projectId" value={projectId} />
            {task && <input type="hidden" name="id" value={task.id} />}
            <TextField
              name="title"
              label="Título"
              defaultValue={task?.title}
              required
            />
            <TextField
              name="description"
              label="Descrição"
              defaultValue={task?.description}
              multiline
            />
            <SelectField
              label="Responsável"
              name="assigneeId"
              defaultValue={task?.assigneeId ?? ""}
            >
              <option value="">Sem responsável</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </SelectField>
            {!task && (
              <p className={styles.meta}>
                A tarefa começa em A Fazer. Sem responsável, apenas o gerente
                poderá alterá-la.
              </p>
            )}
          </ActionForm>
        )}
        {task?.editable && (
          <button
            className={styles.textButton}
            onClick={() => setConfirming(true)}
          >
            Excluir tarefa
          </button>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirming && open && !!task}
        onClose={() => setConfirming(false)}
        title="Excluir tarefa"
        action={deleteTaskAction}
        values={{ projectId, id: task?.id ?? "" }}
        onSuccess={finish}
      >
        Excluir <strong>{task?.title}</strong>? Esta ação não pode ser desfeita.
      </ConfirmDialog>
    </>
  );
}
