import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cookieName, readSession } from "./session.ts";

export const currentUser = cache(async () => {
  const token = (await cookies()).get(cookieName)?.value;
  return token ? (await readSession(token))?.user ?? null : null;
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
