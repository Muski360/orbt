import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listMembers } from "@/lib/workspace";
import { MemberList } from "@/components/workspace/member-list";
import Loading from "../loading";

export const metadata = { title: "Membros — ORBT" };
async function MembersContent() {
  const user = await requireUser();
  if (user.role !== "manager") notFound();
  return <MemberList members={await listMembers(user)} />;
}
export default function MembersPage() { return <Suspense fallback={<Loading />}><MembersContent /></Suspense>; }
