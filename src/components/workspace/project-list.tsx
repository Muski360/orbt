"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
} from "@/app/actions";
import type { ProjectView } from "@/lib/types";
import { LinkFeedback } from "@/components/ui/link-feedback";
import { ActionForm, TextField } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import styles from "./workspace.module.css";

export function ProjectList({
  projects,
  manager,
}: {
  projects: ProjectView[];
  manager: boolean;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<ProjectView | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProjectView | null>(null);
  const project = editor && editor !== "new" ? editor : null;
  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <h1>Projetos</h1>
          <p>
            {manager
              ? "Dê um lugar às ideias do seu time."
              : "Seu próximo passo começa por aqui."}
          </p>
        </div>
        {manager && (
          <button
            className={styles.primaryButton}
            onClick={() => setEditor("new")}
          >
            Criar projeto <span aria-hidden="true">+</span>
          </button>
        )}
      </header>
      {projects.length ? (
        <div className={styles.projectGrid}>
          {projects.map((item) => (
            <article className={styles.projectCard} key={item.id}>
              <h2>
                {item.deleting ? (
                  item.name
                ) : (
                  <Link href={`/projetos/${item.id}`}>
                    {item.name} <LinkFeedback />
                  </Link>
                )}
              </h2>
              <p>
                {item.deleting
                  ? "Exclusão pendente. Conclua a operação para remover o projeto e suas tarefas."
                  : item.description || "Pronto para o próximo passo."}
              </p>
              <div className={styles.cardFooter}>
                <span className={styles.meta}>
                  {item.memberIds.length}{" "}
                  {item.memberIds.length === 1 ? "membro" : "membros"}
                </span>
                {manager && (
                  <div className={styles.actions}>
                    {!item.deleting && (
                      <button
                        className={styles.textButton}
                        onClick={() => setEditor(item)}
                      >
                        Editar
                      </button>
                    )}
                    <button
                      className={styles.textButton}
                      onClick={() => setDeleting(item)}
                    >
                      {item.deleting ? "Concluir exclusão" : "Excluir"}
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <h2>Uma nova órbita começa aqui.</h2>
          <p>
            {manager
              ? "Crie o primeiro projeto para organizar as tarefas."
              : "Seu gerente ainda não associou você a um projeto."}
          </p>
        </div>
      )}
      <Dialog
        open={!!editor}
        onClose={() => setEditor(null)}
        title={project ? "Editar projeto" : "Criar projeto"}
      >
        <ActionForm
          action={project ? updateProjectAction : createProjectAction}
          submit={project ? "Salvar alterações" : "Criar projeto"}
          onSuccess={(result) => {
            setEditor(null);
            if (!project && result.id) router.push(`/projetos/${result.id}`);
          }}
        >
          {project && <input type="hidden" name="id" value={project.id} />}
          <TextField
            name="name"
            label="Nome do projeto"
            defaultValue={project?.name}
            required
          />
          <TextField
            name="description"
            label="Descrição"
            defaultValue={project?.description}
            multiline
          />
        </ActionForm>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Excluir projeto"
        action={deleteProjectAction}
        values={{ id: deleting?.id ?? "" }}
        onSuccess={() => setDeleting(null)}
      >
        Excluir <strong>{deleting?.name}</strong> também exclui todas as suas
        tarefas. Esta ação não pode ser desfeita.
      </ConfirmDialog>
    </>
  );
}
