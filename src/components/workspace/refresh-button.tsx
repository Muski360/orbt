"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Spinner } from "@/components/ui/loading-indicator";
import styles from "./workspace.module.css";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className={styles.secondaryButton}
      type="button"
      disabled={pending}
      aria-busy={pending}
      aria-live="polite"
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Atualizando…" : "Atualizar"}
      {pending ? <Spinner /> : <span aria-hidden="true">↻</span>}
    </button>
  );
}
