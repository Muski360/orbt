"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "@/lib/types";
import { Spinner } from "@/components/ui/loading-indicator";
import { DialogPendingContext } from "./dialog";
import styles from "./form.module.css";
import buttons from "./button.module.css";

export type FormAction = (
  state: ActionResult,
  form: FormData,
) => Promise<ActionResult>;
const Errors = createContext<Record<string, string>>({});

export function ActionForm({
  action,
  children,
  submit,
  onSuccess,
  danger = false,
}: {
  action: FormAction;
  children: ReactNode;
  submit: string;
  onSuccess?: (result: Extract<ActionResult, { ok: true }>) => void;
  danger?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const setDialogPending = useContext(DialogPendingContext);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionResult, form: FormData): Promise<ActionResult> => {
      try {
        const result = await action(previous, form);
        // A revalidação pode desmontar o formulário antes de um efeito de sucesso.
        if (result.ok) onSuccess?.(result);
        return result;
      } catch (error) {
        unstable_rethrow(error);
        return {
          ok: false,
          error:
            "Não foi possível enviar. Verifique a conexão e tente novamente.",
        };
      } finally {
        setDialogPending?.(false);
      }
    },
    { ok: false },
  );
  useEffect(() => {
    if (!state.ok)
      ref.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
        ?.focus();
  }, [state]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={styles.form}
      aria-busy={pending}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setDialogPending?.(true);
        // O envio manual preserva os campos quando o servidor devolve um erro.
        const form = new FormData(event.currentTarget);
        startTransition(() => formAction(form));
      }}
    >
      <Errors.Provider value={!state.ok ? (state.fields ?? {}) : {}}>
        <fieldset disabled={pending} className={styles.fields}>
          {children}
        </fieldset>
      </Errors.Provider>
      {!state.ok && state.error && (
        <p className={styles.error} role="alert" tabIndex={-1}>
          {state.error}
        </p>
      )}
      <button
        className={danger ? buttons.danger : buttons.primary}
        type="submit"
        disabled={pending}
        aria-live="polite"
      >
        {pending ? "Aguarde…" : submit}
        {pending ? <Spinner /> : <span aria-hidden="true">↗</span>}
      </button>
    </form>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  children,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: ReactNode;
  required?: boolean;
}) {
  const id = useId();
  const error = useContext(Errors)[name];
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {children}
      </select>
      {error && (
        <span id={`${id}-error`} className={styles.fieldError}>
          {error}
        </span>
      )}
    </div>
  );
}

export function TextField({
  label,
  name,
  type = "text",
  defaultValue = "",
  multiline = false,
  autoComplete,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  multiline?: boolean;
  autoComplete?: string;
  required?: boolean;
}) {
  const id = useId();
  const error = useContext(Errors)[name];
  const common = {
    id,
    name,
    defaultValue,
    required,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {multiline ? (
        <textarea {...common} rows={4} />
      ) : (
        <input {...common} type={type} autoComplete={autoComplete} />
      )}
      {error && (
        <span id={`${id}-error`} className={styles.fieldError}>
          {error}
        </span>
      )}
    </div>
  );
}
