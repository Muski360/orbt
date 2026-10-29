"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import styles from "./workspace.module.css";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className={styles.secondaryButton} type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Atualizando…" : "Atualizar"}<span aria-hidden="true">↻</span></button>;
}
