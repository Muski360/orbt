"use client";

import { useState } from "react";
import { addMemberAction, removeMemberAction } from "@/app/actions";
import type { MemberView, PersonView, ProjectView } from "@/lib/types";
import { ActionForm, SelectField } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import styles from "./workspace.module.css";

export function ProjectMembers({
  project,
  people,
  members,
  manager,
}: {
  project: ProjectView;
  people: PersonView[];
  members: MemberView[];
  manager: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<PersonView | null>(null);
  const available = members.filter(
    (member) =>
      !member.deleting &&
      !project.memberIds.includes(member.id) &&
      !project.pendingRemovalIds.includes(member.id),
  );
  const pending = members.filter((member) =>
    project.pendingRemovalIds.includes(member.id),
  );
  return (
    <>
      <button className={styles.secondaryButton} onClick={() => setOpen(true)}>
        Participantes ({people.length}) <span aria-hidden="true">↗</span>
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Participantes do projeto"
      >
        <div>
          {people.map((person) => (
            <div className={styles.memberRow} key={person.id}>
              <div>
                <strong>{person.name}</strong>
                {person.id === project.ownerId && (
                  <p className={styles.meta}>Gerente do projeto</p>
                )}
              </div>
              {manager && person.id !== project.ownerId && (
                <button
                  className={styles.textButton}
                  onClick={() => setRemoving(person)}
                >
                  Retirar
                </button>
              )}
            </div>
          ))}
          {pending.map((person) => (
            <div className={styles.memberRow} key={person.id}>
              <div>
                <strong>{person.name}</strong>
                <p>Retirada pendente</p>
              </div>
              <button
                className={styles.textButton}
                onClick={() => setRemoving(person)}
              >
                Concluir retirada
              </button>
            </div>
          ))}
        </div>
        {manager &&
          (available.length ? (
            <ActionForm
              action={addMemberAction}
              submit="Associar membro"
              onSuccess={() => setOpen(false)}
            >
              <input type="hidden" name="projectId" value={project.id} />
              <SelectField label="Adicionar ao projeto" name="memberId">
                {available.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </SelectField>
            </ActionForm>
          ) : (
            <p className={styles.meta}>
              Nenhum outro membro disponível para associação.
            </p>
          ))}
      </Dialog>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Retirar membro"
        action={removeMemberAction}
        submit="Confirmar retirada"
        values={{ projectId: project.id, memberId: removing?.id ?? "" }}
        onSuccess={() => {
          setRemoving(null);
          setOpen(false);
        }}
      >
        Retirar <strong>{removing?.name}</strong> deste projeto? Suas tarefas
        ficarão sem responsável e sua conta será mantida.
      </ConfirmDialog>
    </>
  );
}
