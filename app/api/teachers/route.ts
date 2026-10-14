import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/school";

export const runtime = "nodejs";

const teacherSchema = z.object({
  employeeId: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(120),
  designation: z.string().trim().min(2).max(100),
  email: z
    .union([z.string().trim().email().max(254), z.literal("")])
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value)),
  phone: z
    .union([z.string().trim().max(40), z.literal("")])
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value)),
});

const allowedRoles = ["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"] as const;

export async function GET(request: Request) {
  const access = await authorize([...allowedRoles]);
  if (!access.ok) return access.response;
  const search = new URL(request.url).searchParams.get("search")?.trim();
  const teachers = await prisma.teacher.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { employeeId: { contains: search, mode: "insensitive" } },
            { designation: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    take: 500,
  });
  return NextResponse.json(
    teachers.map((teacher) => ({
      ...teacher,
      createdAt: teacher.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  const access = await authorize(["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"]);
  if (!access.ok) return access.response;
  const parsed = await parseJson(request, teacherSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const teacher = await prisma.$transaction(async (tx) => {
      const created = await tx.teacher.create({
        data: {
          employeeId: parsed.data.employeeId,
          name: parsed.data.name,
          designation: parsed.data.designation,
          email: parsed.data.email ?? null,
          phone: parsed.data.phone ?? null,
        },
      });
      await writeAudit(tx, access.user.id, "create", "teachers", created.id, "Teacher record created.");
      return created;
    });
    return NextResponse.json(
      { ...teacher, createdAt: teacher.createdAt.toISOString() },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That employee ID is already in use." }, { status: 409 });
    }
    throw error;
  }
}