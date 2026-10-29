import { z } from "zod";
import { statuses } from "./types.ts";

const descriptionSchema = z.string().trim().default("");

export const idSchema = z.string().uuid("Identificador inválido.");
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.");
export const passwordSchema = z
  .string()
  .min(1, "Informe a senha.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "A senha deve ter até 72 bytes (limite do bcrypt).",
  );
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export const memberSchema = loginSchema.extend({
  name: z.string().trim().min(1, "Informe o nome."),
});
export const projectSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do projeto."),
  description: descriptionSchema,
});
export const projectEditSchema = projectSchema.extend({ id: idSchema });
export const entitySchema = z.object({ id: idSchema });
export const membershipSchema = z.object({
  projectId: idSchema,
  memberId: idSchema,
});
export const taskSchema = z.object({
  projectId: idSchema,
  title: z.string().trim().min(1, "Informe o título."),
  description: descriptionSchema,
  assigneeId: z
    .union([idSchema, z.literal("")])
    .default("")
    .transform((value) => value || null),
});
export const taskEditSchema = taskSchema.extend({ id: idSchema });
export const taskIdSchema = z.object({ projectId: idSchema, id: idSchema });
export const taskMoveSchema = taskIdSchema.extend({
  status: z.enum(statuses.map((status) => status.id)),
});
