import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { currentAcademicSession, parseJson } from "@/lib/school";

export const runtime = "nodejs";

const classSchema = z.object({
  name: z.string().trim().min(1).max(80),
  capacity: z.coerce.number().int().min(1).max(3000).default(30),
});

const classRoles = ["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "RECEPTIONIST"] as const;

export async function GET() {
  const access = await authorize([...classRoles]);
  if (!access.ok) return access.response;
  const session = await currentAcademicSession();
  if (!session) return NextResponse.json({ error: "Complete school setup first." }, { status: 409 });
  const classes = await prisma.schoolClass.findMany({
    where: { sessionId: session.id },
    include: {
      sections: {
        orderBy: { name: "asc" },
        include: { _count: { select: { enrollments: true } } },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(
    classes.map((schoolClass) => ({
      id: schoolClass.id,
      name: schoolClass.name,
      capacity: schoolClass.capacity,
      studentCount: schoolClass._count.enrollments,
      sections: schoolClass.sections.map((section) => ({
        id: section.id,
        name: section.name,
        capacity: section.capacity,
        studentCount: section._count.enrollments,
      })),
    })),
  );
}

export async function POST(request: Request) {
  const access = await authorize(["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"]);
  if (!access.ok) return access.response;
  const parsed = await parseJson(request, classSchema);
  if ("response" in parsed) return parsed.response;
  const session = await currentAcademicSession();
  if (!session) return NextResponse.json({ error: "Complete school setup first." }, { status: 409 });

  try {
    const schoolClass = await prisma.$transaction(async (tx) => {
      const created = await tx.schoolClass.create({
        data: { ...parsed.data, sessionId: session.id },
      });
      await writeAudit(tx, access.user.id, "create", "classes", created.id, "Class created.");
      return created;
    });
    return NextResponse.json(
      {
        id: schoolClass.id,
        name: schoolClass.name,
        capacity: schoolClass.capacity,
        studentCount: 0,
        sections: [],
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A class with that name already exists in this session." }, { status: 409 });
    }
    throw error;
  }
}