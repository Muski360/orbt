import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { SignJWT, decodeJwt } from "jose";
import { collections, closeDatabase } from "../src/lib/db.ts";
import { seedDatabase } from "../src/lib/seed.ts";
import { authenticate } from "../src/lib/credentials.ts";
import {
  issueSession,
  readSession,
  revokeSession,
} from "../src/lib/session.ts";
import {
  loginSchema,
  passwordSchema,
  projectSchema,
  taskSchema,
} from "../src/lib/validation.ts";
import * as projects from "../src/lib/workspace/projects.ts";
import * as members from "../src/lib/workspace/members.ts";
import * as tasks from "../src/lib/workspace/tasks.ts";
import { toUserView } from "../src/lib/views.ts";
import { getInitials } from "../src/lib/format.ts";

const uri =
  process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017/orbt_test";
assert.equal(
  new URL(uri).pathname,
  "/orbt_test",
  "Os testes só podem gravar em orbt_test.",
);
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
    const admin = toUserView(seeded);
    const secondId = randomUUID();
    await db.users.insertOne({
      _id: secondId,
      name: "Outro gerente (teste)",
      email: `${prefix}-manager@orbt.test`,
      passwordHash: await hash("orbt123456", 4),
      role: "manager",
      createdBy: null,
      deleting: false,
      createdAt: new Date(),
    });
    userIds.push(secondId);
    const other = toUserView((await db.users.findOne({ _id: secondId }))!);

    await t.test(
      "seed não sobrescreve contas, senhas ou projetos",
      async () => {
        await seedDatabase();
        const again = (await db.users.findOne({ _id: admin.id }))!;
        assert.equal(again.passwordHash, seeded.passwordHash);
        assert.equal(await db.users.countDocuments({ email: admin.email }), 1);
      },
    );

    await t.test("valida e-mail e limite em bytes da senha", () => {
      assert.equal(
        loginSchema.parse({
          email: " ADMIN@ADMIN.COM ",
          password: "admin123123",
        }).email,
        "admin@admin.com",
      );
      assert.equal(passwordSchema.safeParse("😀".repeat(19)).success, false);
      assert.equal(passwordSchema.safeParse("a".repeat(72)).success, true);
      assert.equal(
        loginSchema.safeParse({ email: "inválido", password: "" }).success,
        false,
      );
      assert.equal(getInitials("  Ana   Beatriz Silva "), "AB");
      assert.equal(getInitials("😀 Equipe"), "😀E");
      assert.equal(getInitials(" "), "—");
      assert.deepEqual(
        projectSchema.parse({ name: " Projeto ", ownerId: "ignorado" }),
        { name: "Projeto", description: "" },
      );
      const projectId = randomUUID();
      assert.deepEqual(
        taskSchema.parse({ projectId, title: "Tarefa", status: "done" }),
        { projectId, title: "Tarefa", description: "", assigneeId: null },
      );
    });

    await t.test(
      "login, JWT inválido/expirado, sessão expirada e logout",
      async () => {
        assert.equal(await authenticate(admin.email, "incorreta"), null);
        assert.equal(
          (await authenticate(admin.email, "admin123123"))?.id,
          admin.id,
        );
        const session = await issueSession(admin.id);
        const id = decodeJwt(session.token).jti!;
        sessionIds.push(id);
        assert.equal((await readSession(session.token))?.user.id, admin.id);
        const parts = session.token.split(".");
        parts[2] = (parts[2][0] === "a" ? "b" : "a") + parts[2].slice(1);
        assert.equal(await readSession(parts.join(".")), null);
        const withoutExpiration = await new SignJWT({})
          .setProtectedHeader({ alg: "HS256" })
          .setSubject(admin.id)
          .setJti(id)
          .setIssuer("orbt")
          .setAudience("orbt-web")
          .setIssuedAt()
          .sign(new TextEncoder().encode(process.env.JWT_SECRET));
        assert.equal(await readSession(withoutExpiration), null);
        const expired = await new SignJWT({})
          .setProtectedHeader({ alg: "HS256" })
          .setSubject(admin.id)
          .setJti(id)
          .setIssuer("orbt")
          .setAudience("orbt-web")
          .setExpirationTime(Math.floor(Date.now() / 1000) - 5)
          .sign(new TextEncoder().encode(process.env.JWT_SECRET));
        assert.equal(await readSession(expired), null);
        await db.sessions.updateOne(
          { _id: id },
          { $set: { expiresAt: new Date(0) } },
        );
        assert.equal(await readSession(session.token), null);
        const active = await issueSession(admin.id);
        sessionIds.push(decodeJwt(active.token).jti!);
        await revokeSession(active.token);
        assert.equal(await readSession(active.token), null);
      },
    );

    await t.test(
      "tentativas concorrentes respeitam bloqueio e expiração",
      async () => {
        const id = randomUUID();
        userIds.push(id);
        const email = `${prefix}-lock@orbt.test`;
        await db.users.insertOne({
          _id: id,
          name: "Conta de bloqueio",
          email,
          passwordHash: await hash("orbt123456", 4),
          role: "member",
          createdBy: admin.id,
          deleting: false,
          createdAt: new Date(),
        });
        await Promise.all(
          Array.from({ length: 9 }, () => authenticate(email, "incorreta")),
        );
        assert.equal((await db.users.findOne({ _id: id }))?.failedLogins, 9);
        await authenticate(email, "incorreta");
        assert.ok(
          (await db.users.findOne({ _id: id }))!.lockedUntil! > new Date(),
        );
        assert.equal(await authenticate(email, "orbt123456"), null);
        await db.users.updateOne(
          { _id: id },
          { $set: { lockedUntil: new Date(0) } },
        );
        await authenticate(email, "incorreta");
        assert.equal((await db.users.findOne({ _id: id }))?.failedLogins, 1);
        assert.equal((await authenticate(email, "orbt123456"))?.id, id);
        assert.equal(
          (await db.users.findOne({ _id: id }))?.failedLogins,
          undefined,
        );
      },
    );

    const emailA = `${prefix}-a@orbt.test`,
      emailB = `${prefix}-b@orbt.test`;
    await members.createMember(admin, {
      name: "Membro A",
      email: emailA,
      password: "orbt123456",
    });
    await members.createMember(admin, {
      name: "Membro B",
      email: emailB,
      password: "orbt123456",
    });
    const memberA = toUserView((await db.users.findOne({ email: emailA }))!);
    const memberB = toUserView((await db.users.findOne({ email: emailB }))!);
    userIds.push(memberA.id, memberB.id);
    const projectId = await projects.createProject(admin, {
      name: "Projeto de teste",
      description: "Persistência real",
    });
    projectIds.push(projectId);

    await t.test("restringe propriedade, papéis e associação", async () => {
      await assert.rejects(projects.projectDetail(other, projectId));
      await assert.rejects(projects.projectDetail(memberA, projectId));
      await assert.rejects(
        projects.createProject(
          { ...memberA, role: "manager" },
          { name: "Fraude", description: "" },
        ),
      );
      await assert.rejects(members.deleteMember(other, memberA.id));
      await assert.rejects(
        members.createMember(admin, {
          name: "Duplicado",
          email: emailA,
          password: "orbt123456",
        }),
      );
      await members.addMember(admin, projectId, memberA.id);
      await members.addMember(admin, projectId, memberB.id);
      assert.equal(
        (await projects.listProjects(memberA)).some(
          (project) => project.id === projectId,
        ),
        true,
      );
    });

    await t.test(
      "tarefas começam em A Fazer e respeitam atribuição",
      async () => {
        await tasks.createTask(memberA, {
          projectId,
          title: "Sem responsável",
          description: "",
          assigneeId: null,
        });
        const unassigned = (await db.tasks.findOne({
          projectId,
          title: "Sem responsável",
        }))!;
        assert.equal(unassigned.status, "todo");
        await assert.rejects(
          tasks.moveTask(memberA, projectId, unassigned._id, "done"),
        );
        await tasks.createTask(memberA, {
          projectId,
          title: "Minha tarefa",
          description: "",
          assigneeId: memberA.id,
        });
        const task = (await db.tasks.findOne({
          projectId,
          title: "Minha tarefa",
        }))!;
        await tasks.moveTask(memberA, projectId, task._id, "done");
        assert.equal(
          (await db.tasks.findOne({ _id: task._id }))?.status,
          "done",
        );
        await tasks.updateTask(memberA, {
          id: task._id,
          projectId,
          title: "Reatribuída",
          description: "Detalhes",
          assigneeId: memberB.id,
        });
        await assert.rejects(
          tasks.moveTask(memberA, projectId, task._id, "doing"),
        );
        await assert.rejects(tasks.deleteTask(memberA, projectId, task._id));
        await tasks.moveTask(admin, projectId, task._id, "doing");
        assert.equal(
          (await projects.projectDetail(memberB, projectId)).tasks.find(
            (item) => item.id === task._id,
          )?.editable,
          true,
        );
        await members.removeMember(admin, projectId, memberB.id);
        assert.equal(
          (await db.tasks.findOne({ _id: task._id }))?.assigneeId,
          null,
        );
        await assert.rejects(projects.projectDetail(memberB, projectId));
        await assert.rejects(
          tasks.createTask(admin, {
            projectId,
            title: "Inválida",
            description: "",
            assigneeId: memberB.id,
          }),
        );
        await db.projects.updateOne(
          { _id: projectId },
          { $set: { deleting: true } },
        );
        await assert.rejects(
          projects.projectDetail({ ...memberA, role: "manager" }, projectId),
        );
        await db.projects.updateOne(
          { _id: projectId },
          { $set: { deleting: false } },
        );
      },
    );

    await t.test(
      "dados permanecem após reconectar e operações têm retomada",
      async () => {
        await closeDatabase();
        db = await collections();
        assert.equal(
          (await projects.projectDetail(admin, projectId)).tasks.length,
          2,
        );
        await tasks.createTask(admin, {
          projectId,
          title: "Preservada",
          description: "",
          assigneeId: memberA.id,
        });
        const session = await issueSession(memberA.id);
        sessionIds.push(decodeJwt(session.token).jti!);
        await db.projects.updateOne(
          { _id: projectId },
          {
            $set: {
              lockToken: "simulated-conflict",
              lockUntil: new Date(Date.now() + 60_000),
            },
          },
        );
        await assert.rejects(members.deleteMember(admin, memberA.id));
        assert.equal(
          (await db.users.findOne({ _id: memberA.id }))?.deleting,
          true,
        );
        assert.equal(await readSession(session.token), null);
        await db.projects.updateOne(
          { _id: projectId },
          { $unset: { lockToken: "", lockUntil: "" } },
        );
        await members.deleteMember(admin, memberA.id);
        assert.equal(await db.users.findOne({ _id: memberA.id }), null);
        assert.equal(
          (await db.tasks.findOne({ projectId, title: "Preservada" }))
            ?.assigneeId,
          null,
        );
        assert.equal(
          (await db.projects.findOne({ _id: projectId }))?.memberIds.includes(
            memberA.id,
          ),
          false,
        );
        await db.projects.updateOne(
          { _id: projectId },
          { $set: { deleting: true } },
        );
        await db.tasks.deleteOne({ projectId, title: "Sem responsável" });
        await projects.deleteProject(admin, projectId);
        assert.equal(await db.projects.findOne({ _id: projectId }), null);
        assert.equal(await db.tasks.countDocuments({ projectId }), 0);
      },
    );
  } finally {
    const db = await collections();
    await db.tasks.deleteMany({ projectId: { $in: projectIds } });
    await db.projects.deleteMany({ _id: { $in: projectIds } });
    await db.sessions.deleteMany({
      $or: [{ _id: { $in: sessionIds } }, { userId: { $in: userIds } }],
    });
    await db.users.deleteMany({ _id: { $in: userIds } });
    await closeDatabase();
  }
});
