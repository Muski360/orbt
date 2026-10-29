"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MongoServerError } from "mongodb";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { authenticate } from "@/lib/credentials";
import { cookieName, issueSession, revokeSession } from "@/lib/session";
import { AppError } from "@/lib/errors";
import * as schemas from "@/lib/validation";
import * as workspace from "@/lib/workspace";
import type { ActionResult, UserView } from "@/lib/types";

function validationError(error: z.ZodError): ActionResult {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[String(issue.path[0])] ??= issue.message;
  return { ok: false, error: "Confira os campos informados.", fields };
}

async function perform<T>(schema: z.ZodType<T>, form: FormData, operation: (user: UserView, input: T) => Promise<string | void>): Promise<ActionResult> {
  const user = await requireUser();
  const input = schema.safeParse(Object.fromEntries(form));
  if (!input.success) return validationError(input.error);
  try {
    const id = await operation(user, input.data);
    return { ok: true, ...(id ? { id } : {}) };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, error: error.message };
    if (error instanceof MongoServerError && error.code === 11000) return { ok: false, error: "Este e-mail já está cadastrado.", fields: { email: "Este e-mail já está cadastrado." } };
    console.error("Falha ao gravar operação ORBT:", error instanceof Error ? error.name : "erro desconhecido");
    return { ok: false, error: "Não foi possível concluir. Verifique a conexão e tente novamente. Exclusões pendentes podem ser retomadas." };
  } finally {
    revalidatePath("/projetos");
    revalidatePath("/projetos/[id]", "page");
    revalidatePath("/membros");
  }
}

export async function loginAction(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const input = schemas.loginSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return validationError(input.error);
  try {
    const user = await authenticate(input.data.email, input.data.password);
    if (!user) return { ok: false, error: "E-mail ou senha inválidos. Se houver várias tentativas, aguarde 15 minutos." };
    const { token, expiresAt } = await issueSession(user.id);
    const url = new URL(process.env.APP_URL ?? "http://localhost:3000");
    (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", path: "/", expires: expiresAt });
  } catch (error) {
    console.error("Falha ao autenticar ORBT:", error instanceof Error ? error.name : "erro desconhecido");
    return { ok: false, error: "Não foi possível entrar. Verifique a conexão e a configuração do servidor." };
  }
  redirect("/projetos");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (token) await revokeSession(token);
  cookieStore.delete(cookieName);
  redirect("/login");
}

export async function createProjectAction(_state: ActionResult, form: FormData) {
  return perform(schemas.projectSchema, form, workspace.createProject);
}
export async function updateProjectAction(_state: ActionResult, form: FormData) {
  return perform(schemas.projectEditSchema, form, workspace.updateProject);
}
export async function deleteProjectAction(_state: ActionResult, form: FormData) {
  return perform(schemas.entitySchema, form, (user, input) => workspace.deleteProject(user, input.id));
}
export async function createMemberAction(_state: ActionResult, form: FormData) {
  return perform(schemas.memberSchema, form, workspace.createMember);
}
export async function deleteMemberAction(_state: ActionResult, form: FormData) {
  return perform(schemas.entitySchema, form, (user, input) => workspace.deleteMember(user, input.id));
}
export async function addMemberAction(_state: ActionResult, form: FormData) {
  return perform(schemas.membershipSchema, form, (user, input) => workspace.addMember(user, input.projectId, input.memberId));
}
export async function removeMemberAction(_state: ActionResult, form: FormData) {
  return perform(schemas.membershipSchema, form, (user, input) => workspace.removeMember(user, input.projectId, input.memberId));
}
export async function createTaskAction(_state: ActionResult, form: FormData) {
  return perform(schemas.taskSchema, form, workspace.createTask);
}
export async function updateTaskAction(_state: ActionResult, form: FormData) {
  return perform(schemas.taskEditSchema, form, workspace.updateTask);
}
export async function deleteTaskAction(_state: ActionResult, form: FormData) {
  return perform(schemas.taskIdSchema, form, (user, input) => workspace.deleteTask(user, input.projectId, input.id));
}
export async function moveTaskAction(_state: ActionResult, form: FormData) {
  return perform(schemas.taskMoveSchema, form, (user, input) => workspace.moveTask(user, input.projectId, input.id, input.status));
}
