import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { WorkspaceNav } from "./workspace-nav";
import styles from "./workspace.module.css";

export async function WorkspaceShell({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className={styles.workspace}>
      <a href="#conteudo-app" className={styles.skipLink}>Pular para o conteúdo</a>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label="ORBT — início">
          <span><Image src="/assets/orbt_isotipo.svg" alt="" width={42} height={26} /></span>ORBT
        </Link>
        <WorkspaceNav manager={user.role === "manager"} />
        <div className={styles.userBlock}>
          <strong>{user.name}</strong>
          <span>{user.role === "manager" ? "Gerente" : "Membro"}</span>
          <form action={logoutAction}><button type="submit">Sair <span aria-hidden="true">↗</span></button></form>
        </div>
      </aside>
      <main id="conteudo-app" tabIndex={-1} className={styles.content}>{children}</main>
    </div>
  );
}
