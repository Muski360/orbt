"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/loading-indicator";

export function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-live="polite"
    >
      {pending ? "Saindo…" : "Sair"}
      {pending ? <Spinner /> : <span aria-hidden="true">↗</span>}
    </button>
  );
}
