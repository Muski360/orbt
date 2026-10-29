import { z } from "zod";

export const idSchema = z.string().uuid("Identificador inválido.");
export const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido.");
export const passwordSchema = z.string().min(1, "Informe a senha.").refine((value) => new TextEncoder().encode(value).length <= 72, "A senha deve ter até 72 bytes (limite do bcrypt).");
export const loginSchema = z.object({ email: emailSchema, password: passwordSchema });
export const memberSchema = loginSchema.extend({ name: z.string().trim().min(1, "Informe o nome.") });
export const projectSchema = z.object({ name: z.string().trim().min(1, "Informe o nome do projeto."), description: z.string().trim() });
export const projectEditSchema = projectSchema.extend({ id: idSchema });
export const entitySchema = z.object({ id: idSchema });
export const membershipSchema = z.object({ projectId: idSchema, memberId: idSchema });
export const taskSchema = z.object({
  projectId: idSchema,
  title: z.string().trim().min(1, "Informe o título."),
  description: z.string().trim(),
  assigneeId: z.union([idSchema, z.literal("")]).transform((value) => value || null),
});
export const taskEditSchema = taskSchema.extend({ id: idSchema });
export const taskIdSchema = z.object({ projectId: idSchema, id: idSchema });
export const taskMoveSchema = taskIdSchema.extend({ status: z.enum(["todo", "doing", "done"]) });
