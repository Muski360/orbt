"use client";

import { loginAction } from "@/app/actions";
import { ActionForm, TextField } from "@/components/ui/form";

export function LoginForm() {
  return (
    <ActionForm action={loginAction} submit="Entrar">
      <TextField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="username"
        required
      />
      <TextField
        name="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        required
      />
    </ActionForm>
  );
}
