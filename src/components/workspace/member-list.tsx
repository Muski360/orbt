"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMemberAction, deleteMemberAction } from "@/app/actions";
import type { MemberView } from "@/lib/types";
import { ActionForm, TextField } from "./form";
import { Dialog } from "./dialog";
import styles from "./workspace.module.css";

export function MemberList({ members }: { members: MemberView[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<MemberView | null>(null);
  return <>
    <header className={styles.pageHeader}><div><h1>Membros</h1><p>As pessoas que fazem as ideias acontecerem.</p></div><button className={styles.primaryButton} onClick={() => setCreating(true)}>Cadastrar membro <span aria-hidden="true">+</span></button></header>
    {members.length ? <div className={styles.memberList}>{members.map((member) => <article className={styles.memberRow} key={member.id}>
      <div className={styles.memberInfo}><span className={styles.avatar} aria-hidden="true">{member.name.slice(0, 2).toUpperCase()}</span><div><strong>{member.name}</strong><p>{member.email}</p>{member.deleting && <p>Exclusão pendente · acesso bloqueado</p>}</div></div>
      <button className={styles.textButton} onClick={() => setDeleting(member)}>{member.deleting ? "Concluir exclusão" : "Excluir"}</button>
    </article>)}</div> : <div className={styles.empty}><h2>Junte o seu time.</h2><p>Cadastre os membros e associe-os aos projetos.</p></div>}
    <Dialog open={creating} onClose={() => setCreating(false)} title="Cadastrar membro">
      <ActionForm action={createMemberAction} submit="Cadastrar membro" onSuccess={() => { setCreating(false); router.refresh(); }}>
        <TextField name="name" label="Nome" autoComplete="name" required />
        <TextField name="email" label="E-mail" type="email" autoComplete="off" required />
        <TextField name="password" label="Senha inicial" type="password" autoComplete="new-password" required />
      </ActionForm>
    </Dialog>
    <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Excluir membro">
      <p>Excluir a conta de <strong>{deleting?.name}</strong> retira seus acessos e participações. Suas tarefas serão preservadas e ficarão sem responsável.</p>
      <ActionForm action={deleteMemberAction} submit="Confirmar exclusão" danger onSuccess={() => { setDeleting(null); router.refresh(); }}><input type="hidden" name="id" value={deleting?.id ?? ""} /></ActionForm>
    </Dialog>
  </>;
}
