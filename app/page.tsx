import { redirect } from "next/navigation";
import { auth } from "../auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [administratorCount, session] = await Promise.all([
    prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
    auth(),
  ]);

  if (administratorCount === 0) redirect("/setup");
  if (!session?.user) redirect("/login");
  redirect("/dashboard");
}