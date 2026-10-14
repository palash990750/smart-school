import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const administrators = await prisma.user.count({
    where: { role: "SUPER_ADMIN" },
  });
  return NextResponse.json({ needsSetup: administrators === 0 });
}