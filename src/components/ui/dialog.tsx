"use client";

import {
  createContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./dialog.module.css";
import buttons from "./button.module.css";

export const DialogPendingContext = createContext<
  ((pending: boolean) => void) | null
>(null);

export function Dialog({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <DialogPendingContext.Provider value={setPending}>
      <dialog
        ref={ref}
        className={styles.dialog}
        aria-labelledby={id}
        onCancel={(event) => {
          event.preventDefault();
          if (!pending) onClose();
        }}
        onClose={onClose}
      >
        <div className={styles.dialogHeader}>
          <h2 id={id}>{title}</h2>
          <button
            className={buttons.icon}
            type="button"
            onClick={onClose}
            aria-label="Fechar diálogo"
            disabled={pending}
          >
            ×
          </button>
        </div>
        {open && <div className={styles.dialogBody}>{children}</div>}
      </dialog>
    </DialogPendingContext.Provider>
  );
}
