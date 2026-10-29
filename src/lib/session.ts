import "server-only";
import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { collections } from "./db.ts";
import { toUserView } from "./views.ts";

export const cookieName = "orbt_session";

function secret() {
  const value = process.env.JWT_SECRET;
  if (
    !value ||
    value.startsWith("replace-") ||
    new TextEncoder().encode(value).length < 32
  ) {
    throw new Error("Configure JWT_SECRET com pelo menos 32 bytes aleatórios.");
  }
  return new TextEncoder().encode(value);
}

export async function issueSession(userId: string) {
  const key = secret();
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(id)
    .setIssuer("orbt")
    .setAudience("orbt-web")
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(key);
  const { sessions } = await collections();
  await sessions.insertOne({ _id: id, userId, expiresAt });
  return { token, expiresAt };
}

export async function readSession(token: string) {
  const key = secret();
  let payload;
  try {
    payload = (
      await jwtVerify(token, key, {
        algorithms: ["HS256"],
        issuer: "orbt",
        audience: "orbt-web",
        requiredClaims: ["exp", "iat", "sub", "jti"],
      })
    ).payload;
  } catch {
    return null;
  }
  if (!payload.sub || !payload.jti) return null;
  const { sessions, users } = await collections();
  const session = await sessions.findOne({
    _id: payload.jti,
    userId: payload.sub,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await users.findOne({ _id: session.userId, deleting: false });
  return user ? { user: toUserView(user), sessionId: session._id } : null;
}

export async function revokeSession(token: string) {
  const session = await readSession(token);
  if (session) {
    const { sessions } = await collections();
    await sessions.deleteOne({ _id: session.sessionId });
  }
}
