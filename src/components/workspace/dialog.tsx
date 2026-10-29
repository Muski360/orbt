"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./workspace.module.css";

export function Dialog({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={id} onCancel={onClose} onClose={onClose}>
      <div className={styles.dialogHeader}>
        <h2 id={id}>{title}</h2>
        <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Fechar diálogo">×</button>
      </div>
      {open && <div className={styles.dialogBody}>{children}</div>}
    </dialog>
  );
}
