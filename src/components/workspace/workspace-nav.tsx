"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./workspace.module.css";

export function WorkspaceNav({ manager }: { manager: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Navegação da aplicação">
      {[{ href: "/projetos", label: "Projetos" }, ...(manager ? [{ href: "/membros", label: "Membros" }] : [])].map((link) => (
        <Link key={link.href} href={link.href} aria-current={pathname.startsWith(link.href) ? "page" : undefined}>
          {link.label}<span aria-hidden="true">↗</span>
        </Link>
      ))}
    </nav>
  );
}
