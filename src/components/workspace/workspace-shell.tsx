import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { Spinner } from "@/components/ui/loading-indicator";
import { WorkspaceNav } from "./workspace-nav";
import { LogoutButton } from "./logout-button";
import styles from "./workspace.module.css";

async function SessionNavigation() {
  const user = await currentUser();
  if (!user) return null;

  return (
    <>
      <WorkspaceNav manager={user.role === "manager"} />
      <div className={styles.userBlock}>
        <strong title={user.name}>{user.name}</strong>
        <span>{user.role === "manager" ? "Gerente" : "Membro"}</span>
        <form action={logoutAction}>
          <LogoutButton />
        </form>
      </div>
    </>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.workspace}>
      <a href="#conteudo-app" className={styles.skipLink}>
        Pular para o conteúdo
      </a>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label="ORBT — início">
          <span>
            <Image
              src="/assets/orbt_isotipo.svg"
              alt=""
              width={42}
              height={26}
            />
          </span>
          ORBT
        </Link>
        {/* A sessão não pode impedir o render da página durante o prefetch. */}
        <Suspense
          fallback={
            <div className={styles.navigationLoading} role="status">
              <Spinner />
              <span>Carregando…</span>
            </div>
          }
        >
          <SessionNavigation />
        </Suspense>
      </aside>
      <main id="conteudo-app" tabIndex={-1} className={styles.content}>
        {children}
      </main>
    </div>
  );
}
