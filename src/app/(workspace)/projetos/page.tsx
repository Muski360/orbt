import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listProjects } from "@/lib/workspace";
import { ProjectList } from "@/components/workspace/project-list";
import Loading from "../loading";

export const metadata = { title: "Projetos — ORBT" };
async function ProjectsContent() {
  const user = await requireUser();
  return <ProjectList projects={await listProjects(user)} manager={user.role === "manager"} />;
}
export default function ProjectsPage() { return <Suspense fallback={<Loading />}><ProjectsContent /></Suspense>; }
