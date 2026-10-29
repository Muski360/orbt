import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listProjects } from "@/lib/workspace/projects";
import { ProjectList } from "@/components/workspace/project-list";
import { LoadingState } from "@/components/ui/loading-indicator";

export const metadata = { title: "Projetos — ORBT" };
async function ProjectsContent() {
  const user = await requireUser();
  return (
    <ProjectList
      projects={await listProjects(user)}
      manager={user.role === "manager"}
    />
  );
}
export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <LoadingState label="Carregando projetos…" variant="projects" />
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
