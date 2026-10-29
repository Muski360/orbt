"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addMemberAction, removeMemberAction } from "@/app/actions";
import type { MemberView, PersonView, ProjectView } from "@/lib/types";
import { ActionForm } from "./form";
import { Dialog } from "./dialog";
import styles from "./workspace.module.css";

export function ProjectMembers({ project, people, members, manager }: { project: ProjectView; people: PersonView[]; members: MemberView[]; manager: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<PersonView | null>(null);
  const available = members.filter((member) => !member.deleting && !project.memberIds.includes(member.id) && !project.pendingRemovalIds.includes(member.id));
  const pending = members.filter((member) => project.pendingRemovalIds.includes(member.id));
  return <>
    <button className={styles.secondaryButton} onClick={() => setOpen(true)}>Participantes ({people.length}) <span aria-hidden="true">↗</span></button>
    <Dialog open={open} onClose={() => setOpen(false)} title="Participantes do projeto">
      <div>{people.map((person) => <div className={styles.memberRow} key={person.id}>
        <div><strong>{person.name}</strong>{person.id === project.ownerId && <p className={styles.meta}>Gerente do projeto</p>}</div>
        {manager && person.id !== project.ownerId && <button className={styles.textButton} onClick={() => setRemoving(person)}>Retirar</button>}
      </div>)}{pending.map((person) => <div className={styles.memberRow} key={person.id}><div><strong>{person.name}</strong><p>Retirada pendente</p></div><button className={styles.textButton} onClick={() => setRemoving(person)}>Concluir retirada</button></div>)}</div>
      {manager && (available.length ? <ActionForm action={addMemberAction} submit="Associar membro" onSuccess={() => { setOpen(false); router.refresh(); }}>
        <input type="hidden" name="projectId" value={project.id} />
        <div className={styles.field}><label htmlFor="associate-member">Adicionar ao projeto</label><select id="associate-member" name="memberId">{available.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div>
      </ActionForm> : <p className={styles.meta}>Nenhum outro membro disponível para associação.</p>)}
    </Dialog>
    <Dialog open={!!removing} onClose={() => setRemoving(null)} title="Retirar membro">
      <p>Retirar <strong>{removing?.name}</strong> deste projeto? Suas tarefas ficarão sem responsável e sua conta será mantida.</p>
      <ActionForm action={removeMemberAction} submit="Confirmar retirada" danger onSuccess={() => { setRemoving(null); setOpen(false); router.refresh(); }}>
        <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="memberId" value={removing?.id ?? ""} />
      </ActionForm>
    </Dialog>
  </>;
}
