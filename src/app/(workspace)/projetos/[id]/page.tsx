import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { projectDetail, listMembers } from "@/lib/workspace";
import { AppError } from "@/lib/errors";
import { idSchema } from "@/lib/validation";
import { ProjectWorkspace } from "@/components/workspace/project-workspace";
import styles from "@/components/workspace/workspace.module.css";
import Loading from "../../loading";

export const metadata = { title: "Quadro do projeto — ORBT" };
async function ProjectContent({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  let detail;
  try { detail = await projectDetail(user, id); }
  catch (error) { if (error instanceof AppError) notFound(); throw error; }
  if (detail.project.deleting) return <div className={styles.empty}><h1>Exclusão pendente</h1><p>Conclua a exclusão na lista de projetos.</p><Link className={styles.backLink} href="/projetos">Voltar aos projetos</Link></div>;
  const members = user.role === "manager" ? await listMembers(user) : [];
  return <ProjectWorkspace {...detail} members={members} manager={user.role === "manager"} />;
}
export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) { return <Suspense fallback={<Loading />}><ProjectContent params={params} /></Suspense>; }
