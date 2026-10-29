import "server-only";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { collections } from "./db.ts";

export async function seedDatabase() {
  const { users, projects, tasks, sessions } = await collections();
  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ createdBy: 1 }),
    projects.createIndex({ ownerId: 1 }),
    projects.createIndex({ memberIds: 1 }),
    tasks.createIndex({ projectId: 1, createdAt: 1 }),
    tasks.createIndex({ assigneeId: 1 }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ userId: 1 }),
  ]);
  if (!(await users.findOne({ email: "admin@admin.com" }))) {
    await users.updateOne(
      { email: "admin@admin.com" },
      {
        $setOnInsert: {
          _id: randomUUID(),
          name: "Administrador",
          email: "admin@admin.com",
          passwordHash: await hash("admin123123", 12),
          role: "manager",
          createdBy: null,
          deleting: false,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}
