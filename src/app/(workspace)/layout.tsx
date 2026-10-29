import { Suspense, type ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import Loading from "./loading";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}><WorkspaceShell>{children}</WorkspaceShell></Suspense>;
}
