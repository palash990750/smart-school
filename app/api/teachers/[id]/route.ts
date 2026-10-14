import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/school";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

const teacherUpdateSchema = z.object({
  employeeId: z.string().trim().min(1).max(40).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  designation: z.string().trim().min(2).max(100).optional(),
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

const managerRoles = [
  "SUPER_ADMIN",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
] as const;

export async function GET(
  _request: Request,
  { params }: Context,
) {
  const access = await authorize([
    ...managerRoles,
    "TEACHER",
  ]);

  if (!access.ok) return access.response;

  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({
    where: { id },
  });

  if (!teacher) {
    return NextResponse.json(
      { error: "Teacher not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ...teacher,
    createdAt: teacher.createdAt.toISOString(),
    updatedAt: teacher.updatedAt.toISOString(),
  });
}

export async function PATCH(
  request: Request,
  { params }: Context,
) {
  const access = await authorize([...managerRoles]);

  if (!access.ok) return access.response;

  const { id } = await params;

  const parsed = await parseJson(
    request,
    teacherUpdateSchema,
  );

  if ("response" in parsed) return parsed.response;

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: "At least one field is required." },
      { status: 400 },
    );
  }

  const existing = await prisma.teacher.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Teacher not found." },
      { status: 404 },
    );
  }

  try {
    const teacher = await prisma.$transaction(async (tx) => {
      const updated = await tx.teacher.update({
        where: { id },
        data: parsed.data,
      });

      await writeAudit(
        tx,
        access.user.id,
        "update",
        "teachers",
        id,
        "Teacher record updated.",
      );

      return updated;
    });

    return NextResponse.json({
      ...teacher,
      createdAt: teacher.createdAt.toISOString(),
      updatedAt: teacher.updatedAt.toISOString(),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That employee ID is already in use." },
        { status: 409 },
      );
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: Context,
) {
  const access = await authorize([...managerRoles]);

  if (!access.ok) return access.response;

  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!teacher) {
    return NextResponse.json(
      { error: "Teacher not found." },
      { status: 404 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.teacher.delete({
      where: { id },
    });

    await writeAudit(
      tx,
      access.user.id,
      "delete",
      "teachers",
      id,
      "Teacher record deleted.",
    );
  });

  return new Response(null, { status: 204 });
}