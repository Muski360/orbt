import "server-only";
import { compare } from "bcryptjs";
import { collections } from "./db.ts";
import { toUserView } from "./views.ts";

const dummyHash =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.6w5QdS7wsB.fE2Fo6z9joG5qyjhBqs6";

export async function authenticate(email: string, password: string) {
  const { users } = await collections();
  const user = await users.findOne({ email, deleting: false });
  const valid = await compare(password, user?.passwordHash ?? dummyHash);
  if (!user) return null;
  const now = new Date();
  const eligible = {
    _id: user._id,
    deleting: false,
    $or: [{ lockedUntil: { $exists: false } }, { lockedUntil: { $lte: now } }],
  };
  if (!valid) {
    // Contagem e bloqueio atômicos também quando tentativas chegam ao mesmo tempo.
    await users.updateOne(eligible, [
      {
        $set: {
          failedLogins: {
            $cond: [
              { $ifNull: ["$lockedUntil", false] },
              1,
              { $add: [{ $ifNull: ["$failedLogins", 0] }, 1] },
            ],
          },
        },
      },
      {
        $set: {
          lockedUntil: {
            $cond: [
              { $gte: ["$failedLogins", 10] },
              new Date(now.getTime() + 15 * 60_000),
              "$$REMOVE",
            ],
          },
        },
      },
    ]);
    return null;
  }
  const result = await users.updateOne(eligible, {
    $unset: { failedLogins: "", lockedUntil: "" },
  });
  return result.matchedCount ? toUserView(user) : null;
}
