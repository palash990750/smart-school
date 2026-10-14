import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const setupSchema = z.object({
  schoolName: z.string().trim().min(2).max(120),
  sessionName: z.string().trim().min(4).max(30),
  administratorName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

function academicDates(sessionName: string) {
  const match = sessionName.match(/^(\d{4})\s*[-–/]\s*(\d{2}|\d{4})$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  let endYear = Number(match[2]);
  if (match[2].length === 2) {
    endYear = Math.floor(startYear / 100) * 100 + endYear;
    if (endYear < startYear) endYear += 100;
  }
  if (endYear < startYear || endYear > startYear + 2) return null;
  return {
    startDate: new Date(Date.UTC(startYear, 3, 1)),
    endDate: new Date(Date.UTC(endYear, 2, 31)),
  };
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = setupSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the school, session, administrator, and password fields." },
      { status: 400 },
    );
  }
  const dates = academicDates(parsed.data.sessionName);
  if (!dates) {
    return NextResponse.json(
      { error: "Use an academic session such as 2026-27." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await hash(parsed.data.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(190728431)`;
      const existing = await tx.user.count({ where: { role: "SUPER_ADMIN" } });
      if (existing > 0) throw new Error("SETUP_ALREADY_COMPLETE");

      const session = await tx.academicSession.create({
        data: {
          name: parsed.data.sessionName,
          startDate: dates.startDate,
          endDate: dates.endDate,
          isCurrent: true,
          status: "ACTIVE",
        },
      });
      await tx.schoolSettings.create({
        data: {
          id: "school",
          schoolName: parsed.data.schoolName,
          schoolCode: "SCHOOL",
          email,
        },
      });
      const admin = await tx.user.create({
        data: {
          name: parsed.data.administratorName,
          email,
          passwordHash,
          role: "SUPER_ADMIN",
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "create",
          module: "setup",
          recordId: session.id,
          description: "Initial school, academic session, and administrator created.",
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_ALREADY_COMPLETE") {
      return NextResponse.json(
        { error: "Initial setup has already been completed." },
        { status: 409 },
      );
    }
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ needsSetup: false }, { status: 201 });
}