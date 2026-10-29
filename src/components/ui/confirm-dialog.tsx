"use client";

import type { ReactNode } from "react";
import { Dialog } from "./dialog";
import { ActionForm, type FormAction } from "./form";

export function ConfirmDialog({
  title,
  open,
  onClose,
  action,
  values,
  children,
  onSuccess,
  submit = "Confirmar exclusão",
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  action: FormAction;
  values: Record<string, string>;
  children: ReactNode;
  onSuccess: () => void;
  submit?: string;
}) {
  return (
    <Dialog title={title} open={open} onClose={onClose}>
      <p>{children}</p>
      <ActionForm action={action} submit={submit} danger onSuccess={onSuccess}>
        {Object.entries(values).map(([name, value]) => (
          <input type="hidden" name={name} value={value} key={name} />
        ))}
      </ActionForm>
    </Dialog>
  );
}
