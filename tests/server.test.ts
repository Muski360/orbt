import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { SignJWT, decodeJwt } from "jose";
import { collections, closeDatabase } from "../src/lib/db.ts";
import { seedDatabase } from "../src/lib/seed.ts";
import { authenticate } from "../src/lib/credentials.ts";
import { issueSession, readSession, revokeSession, userView } from "../src/lib/session.ts";
import { loginSchema, passwordSchema } from "../src/lib/validation.ts";
import * as work from "../src/lib/workspace.ts";

const uri = process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017/orbt_test";
assert.equal(new URL(uri).pathname, "/orbt_test", "Os testes só podem gravar em orbt_test.");
process.env.MONGODB_URI = uri;
process.env.JWT_SECRET = "orbt-server-tests-only-secret-with-32-bytes";

test("persistência, autorização e sessões no MongoDB standalone", async (t) => {
  const prefix = `server-${randomUUID()}`;
  const projectIds: string[] = [];
  const userIds: string[] = [];
  const sessionIds: string[] = [];
  try {
    await seedDatabase();
    let db = await collections();
    const seeded = (await db.users.findOne({ email: "admin@admin.com" }))!;
    const admin = userView(seeded);
    const secondId = randomUUID();
    await db.users.insertOne({ _id: secondId, name: "Outro gerente (teste)", email: `${prefix}-manager@orbt.test`, passwordHash: await hash("orbt123456", 4), role: "manager", createdBy: null, deleting: false, createdAt: new Date() });
    userIds.push(secondId);
    const other = userView((await db.users.findOne({ _id: secondId }))!);

    await t.test("seed não sobrescreve contas, senhas ou projetos", async () => {
      await seedDatabase();
      const again = (await db.users.findOne({ _id: admin.id }))!;
      assert.equal(again.passwordHash, seeded.passwordHash);
      assert.equal(await db.users.countDocuments({ email: admin.email }), 1);
    });

    await t.test("valida e-mail e limite em bytes da senha", () => {
      assert.equal(loginSchema.parse({ email: " ADMIN@ADMIN.COM ", password: "admin123123" }).email, "admin@admin.com");
      assert.equal(passwordSchema.safeParse("😀".repeat(19)).success, false);
      assert.equal(passwordSchema.safeParse("a".repeat(72)).success, true);
      assert.equal(loginSchema.safeParse({ email: "inválido", password: "" }).success, false);
    });

    await t.test("login, JWT inválido/expirado, sessão expirada e logout", async () => {
      assert.equal(await authenticate(admin.email, "incorreta"), null);
      assert.equal((await authenticate(admin.email, "admin123123"))?.id, admin.id);
      const session = await issueSession(admin.id);
      const id = decodeJwt(session.token).jti!; sessionIds.push(id);
      assert.equal((await readSession(session.token))?.user.id, admin.id);
      const parts = session.token.split("."); parts[2] = (parts[2][0] === "a" ? "b" : "a") + parts[2].slice(1);
      assert.equal(await readSession(parts.join(".")), null);
      const expired = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(admin.id).setJti(id).setIssuer("orbt").setAudience("orbt-web").setExpirationTime(Math.floor(Date.now() / 1000) - 5).sign(new TextEncoder().encode(process.env.JWT_SECRET));
      assert.equal(await readSession(expired), null);
      await db.sessions.updateOne({ _id: id }, { $set: { expiresAt: new Date(0) } });
      assert.equal(await readSession(session.token), null);
      const active = await issueSession(admin.id); sessionIds.push(decodeJwt(active.token).jti!);
      await revokeSession(active.token);
      assert.equal(await readSession(active.token), null);
    });

    const emailA = `${prefix}-a@orbt.test`, emailB = `${prefix}-b@orbt.test`;
    await work.createMember(admin, { name: "Membro A", email: emailA, password: "orbt123456" });
    await work.createMember(admin, { name: "Membro B", email: emailB, password: "orbt123456" });
    const memberA = userView((await db.users.findOne({ email: emailA }))!);
    const memberB = userView((await db.users.findOne({ email: emailB }))!);
    userIds.push(memberA.id, memberB.id);
    const projectId = await work.createProject(admin, { name: "Projeto de teste", description: "Persistência real" });
    projectIds.push(projectId);

    await t.test("restringe propriedade, papéis e associação", async () => {
      await assert.rejects(work.projectDetail(other, projectId));
      await assert.rejects(work.projectDetail(memberA, projectId));
      await assert.rejects(work.createProject({ ...memberA, role: "manager" }, { name: "Fraude", description: "" }));
      await assert.rejects(work.deleteMember(other, memberA.id));
      await assert.rejects(work.createMember(admin, { name: "Duplicado", email: emailA, password: "orbt123456" }));
      await work.addMember(admin, projectId, memberA.id);
      await work.addMember(admin, projectId, memberB.id);
      assert.equal((await work.listProjects(memberA)).some((project) => project.id === projectId), true);
    });

    await t.test("tarefas começam em A Fazer e respeitam atribuição", async () => {
      await work.createTask(memberA, { projectId, title: "Sem responsável", description: "", assigneeId: null });
      const unassigned = (await db.tasks.findOne({ projectId, title: "Sem responsável" }))!;
      assert.equal(unassigned.status, "todo");
      await assert.rejects(work.moveTask(memberA, projectId, unassigned._id, "done"));
      await work.createTask(memberA, { projectId, title: "Minha tarefa", description: "", assigneeId: memberA.id });
      const task = (await db.tasks.findOne({ projectId, title: "Minha tarefa" }))!;
      await work.moveTask(memberA, projectId, task._id, "done");
      assert.equal((await db.tasks.findOne({ _id: task._id }))?.status, "done");
      await work.updateTask(memberA, { id: task._id, projectId, title: "Reatribuída", description: "Detalhes", assigneeId: memberB.id });
      await assert.rejects(work.moveTask(memberA, projectId, task._id, "doing"));
      await assert.rejects(work.deleteTask(memberA, projectId, task._id));
      await work.moveTask(admin, projectId, task._id, "doing");
      assert.equal((await work.projectDetail(memberB, projectId)).tasks.find((item) => item.id === task._id)?.editable, true);
      await work.removeMember(admin, projectId, memberB.id);
      assert.equal((await db.tasks.findOne({ _id: task._id }))?.assigneeId, null);
      await assert.rejects(work.projectDetail(memberB, projectId));
      await assert.rejects(work.createTask(admin, { projectId, title: "Inválida", description: "", assigneeId: memberB.id }));
    });

    await t.test("dados permanecem após reconectar e operações têm retomada", async () => {
      await closeDatabase(); db = await collections();
      assert.equal((await work.projectDetail(admin, projectId)).tasks.length, 2);
      await work.createTask(admin, { projectId, title: "Preservada", description: "", assigneeId: memberA.id });
      const session = await issueSession(memberA.id); sessionIds.push(decodeJwt(session.token).jti!);
      await db.projects.updateOne({ _id: projectId }, { $set: { lockToken: "simulated-conflict", lockUntil: new Date(Date.now() + 60_000) } });
      await assert.rejects(work.deleteMember(admin, memberA.id));
      assert.equal((await db.users.findOne({ _id: memberA.id }))?.deleting, true);
      assert.equal(await readSession(session.token), null);
      await db.projects.updateOne({ _id: projectId }, { $unset: { lockToken: "", lockUntil: "" } });
      await work.deleteMember(admin, memberA.id);
      assert.equal(await db.users.findOne({ _id: memberA.id }), null);
      assert.equal((await db.tasks.findOne({ projectId, title: "Preservada" }))?.assigneeId, null);
      assert.equal((await db.projects.findOne({ _id: projectId }))?.memberIds.includes(memberA.id), false);
      await db.projects.updateOne({ _id: projectId }, { $set: { deleting: true } });
      await db.tasks.deleteOne({ projectId, title: "Sem responsável" });
      await work.deleteProject(admin, projectId);
      assert.equal(await db.projects.findOne({ _id: projectId }), null);
      assert.equal(await db.tasks.countDocuments({ projectId }), 0);
    });
  } finally {
    const db = await collections();
    await db.tasks.deleteMany({ projectId: { $in: projectIds } });
    await db.projects.deleteMany({ _id: { $in: projectIds } });
    await db.sessions.deleteMany({ $or: [{ _id: { $in: sessionIds } }, { userId: { $in: userIds } }] });
    await db.users.deleteMany({ _id: { $in: userIds } });
    await closeDatabase();
  }
});
