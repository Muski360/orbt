"use client";

import { createContext, useActionState, useContext, useId, type ReactNode } from "react";
import type { ActionResult } from "@/lib/types";
import styles from "./workspace.module.css";

export type FormAction = (state: ActionResult, form: FormData) => Promise<ActionResult>;
const Errors = createContext<Record<string, string>>({});

export function ActionForm({ action, children, submit, onSuccess, danger = false }: {
  action: FormAction; children: ReactNode; submit: string; onSuccess?: (result: Extract<ActionResult, { ok: true }>) => void; danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(async (previous: ActionResult, form: FormData) => {
    const result = await action(previous, form);
    // A revalidação pode desmontar o formulário antes de um efeito de sucesso.
    if (result.ok) onSuccess?.(result);
    return result;
  }, { ok: false });
  return (
    <form action={formAction} className={styles.form} noValidate>
      <Errors.Provider value={!state.ok ? state.fields ?? {} : {}}>
        <fieldset disabled={pending} className={styles.fields}>{children}</fieldset>
      </Errors.Provider>
      {!state.ok && state.error && <p className={styles.error} role="alert">{state.error}</p>}
      <button className={danger ? styles.dangerButton : styles.primaryButton} type="submit" disabled={pending}>
        {pending ? "Aguarde…" : submit}<span aria-hidden="true">{pending ? "…" : "↗"}</span>
      </button>
    </form>
  );
}

export function TextField({ label, name, type = "text", defaultValue = "", multiline = false, autoComplete, required = false }: {
  label: string; name: string; type?: string; defaultValue?: string; multiline?: boolean; autoComplete?: string; required?: boolean;
}) {
  const id = useId();
  const error = useContext(Errors)[name];
  const common = { id, name, defaultValue, required, "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : undefined };
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      {multiline ? <textarea {...common} rows={4} /> : <input {...common} type={type} autoComplete={autoComplete} />}
      {error && <span id={`${id}-error`} className={styles.fieldError}>{error}</span>}
    </div>
  );
}
