import "server-only";
import { compare } from "bcryptjs";
import { collections } from "./db.ts";
import { userView } from "./session.ts";

const dummyHash = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.6w5QdS7wsB.fE2Fo6z9joG5qyjhBqs6";

export async function authenticate(email: string, password: string) {
  const { users } = await collections();
  const user = await users.findOne({ email, deleting: false });
  const valid = await compare(password, user?.passwordHash ?? dummyHash);
  if (!user || (user.lockedUntil && user.lockedUntil > new Date())) return null;
  if (!valid) {
    const failedLogins = user.lockedUntil && user.lockedUntil <= new Date() ? 1 : (user.failedLogins ?? 0) + 1;
    await users.updateOne({ _id: user._id }, { $set: { failedLogins, ...(failedLogins >= 10 ? { lockedUntil: new Date(Date.now() + 15 * 60_000) } : {}) } });
    return null;
  }
  await users.updateOne({ _id: user._id }, { $unset: { failedLogins: "", lockedUntil: "" } });
  return userView(user);
}
