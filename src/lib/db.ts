import "server-only";
import { MongoClient } from "mongodb";
import type { Status } from "./types.ts";

export type User = { _id: string; name: string; email: string; passwordHash: string; role: "manager" | "member"; createdBy: string | null; deleting: boolean; createdAt: Date; failedLogins?: number; lockedUntil?: Date };
export type Project = { _id: string; name: string; description: string; ownerId: string; memberIds: string[]; pendingRemovalIds: string[]; deleting: boolean; createdAt: Date; lockToken?: string; lockUntil?: Date };
export type Task = { _id: string; title: string; description: string; projectId: string; assigneeId: string | null; status: Status; createdAt: Date };
export type Session = { _id: string; userId: string; expiresAt: Date };

const globalDb = globalThis as typeof globalThis & { orbtClient?: Promise<MongoClient> };

export async function collections() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Configure MONGODB_URI em .env.local.");
  if (!globalDb.orbtClient) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    globalDb.orbtClient = client.connect().catch((error) => {
      globalDb.orbtClient = undefined;
      throw error;
    });
  }
  const db = (await globalDb.orbtClient).db();
  return { users: db.collection<User>("users"), projects: db.collection<Project>("projects"), tasks: db.collection<Task>("tasks"), sessions: db.collection<Session>("sessions") };
}

export async function closeDatabase() {
  const client = globalDb.orbtClient;
  globalDb.orbtClient = undefined;
  if (client) await (await client).close();
}
