import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { prisma } from "@/lib/prisma";
import { WorkspaceShell } from '../shell';

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [session, administratorCount] = await Promise.all([
    auth(),
    prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
  ]);
  if (administratorCount === 0) redirect("/setup");
  if (!session?.user) redirect("/login");
  return <WorkspaceShell>{children}</WorkspaceShell>;
}