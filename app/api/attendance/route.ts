import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { currentAcademicSession, parseJson, startOfUtcDay } from "@/lib/school";

export const runtime = "nodejs";

const attendanceStatus = z.enum(["present", "absent", "late", "half_day", "leave"]);
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const saveSchema = z.object({
  date: dateString,
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: attendanceStatus,
        remarks: z.string().max(500).nullable().optional(),
      }),
    )
    .max(3000),
});

const attendanceRoles = ["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"] as const;
const dbStatus = {
  present: "PRESENT",
  absent: "ABSENT",
  late: "LATE",
  half_day: "HALF_DAY",
  leave: "LEAVE",
} as const;

function validDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

export async function GET(request: Request) {
  const access = await authorize([...attendanceRoles]);
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const dateText = url.searchParams.get("date") ?? "";
  const classId = url.searchParams.get("classId") ?? "";
  const sectionId = url.searchParams.get("sectionId") ?? "";
  const date = validDate(dateText);
  if (!date || !classId || !sectionId) {
    return NextResponse.json({ error: "Choose a valid date, class, and section." }, { status: 400 });
  }
  const session = await currentAcademicSession();
  if (!session) return NextResponse.json({ error: "Complete school setup first." }, { status: 409 });

  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: classId, sessionId: session.id },
    include: { sections: { where: { id: sectionId }, select: { name: true } } },
  });
  const section = schoolClass?.sections[0];
  if (!schoolClass || !section) {
    return NextResponse.json({ error: "Class or section not found in the active session." }, { status: 404 });
  }
  const enrollments = await prisma.enrollment.findMany({
    where: {
      sessionId: session.id,
      classId,
      sectionId,
      student: { status: "ACTIVE" },
    },
    include: {
      student: {
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          attendance: { where: { date }, select: { status: true } },
        },
      },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });
  return NextResponse.json({
    date: dateText,
    className: schoolClass.name,
    sectionName: section.name,
    students: enrollments.map(({ student }) => ({
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      status: student.attendance[0]?.status.toLowerCase() ?? null,
    })),
  });
}

export async function PUT(request: Request) {
  const access = await authorize([...attendanceRoles]);
  if (!access.ok) return access.response;
  const parsed = await parseJson(request, saveSchema);
  if ("response" in parsed) return parsed.response;
  const date = validDate(parsed.data.date);
  if (!date) return NextResponse.json({ error: "Enter a valid attendance date." }, { status: 400 });
  const session = await currentAcademicSession();
  if (!session) return NextResponse.json({ error: "Complete school setup first." }, { status: 409 });

  const uniqueIds = new Set(parsed.data.records.map((record) => record.studentId));
  if (uniqueIds.size !== parsed.data.records.length) {
    return NextResponse.json({ error: "A student can only appear once in the register." }, { status: 400 });
  }
  const activeEnrollments = await prisma.enrollment.findMany({
    where: {
      sessionId: session.id,
      classId: parsed.data.classId,
      sectionId: parsed.data.sectionId,
      student: { status: "ACTIVE" },
    },
    select: { studentId: true },
  });
  const enrolledIds = new Set(activeEnrollments.map((entry) => entry.studentId));
  if (
    uniqueIds.size !== enrolledIds.size ||
    [...uniqueIds].some((studentId) => !enrolledIds.has(studentId))
  ) {
    return NextResponse.json({ error: "The register changed. Reload it before saving attendance." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    for (const record of parsed.data.records) {
      await tx.attendance.upsert({
        where: { studentId_date: { studentId: record.studentId, date: startOfUtcDay(date) } },
        create: {
          studentId: record.studentId,
          sessionId: session.id,
          classId: parsed.data.classId,
          sectionId: parsed.data.sectionId,
          date: startOfUtcDay(date),
          status: dbStatus[record.status],
          remarks: record.remarks ?? null,
        },
        update: {
          sessionId: session.id,
          classId: parsed.data.classId,
          sectionId: parsed.data.sectionId,
          status: dbStatus[record.status],
          remarks: record.remarks ?? null,
        },
      });
    }
    await writeAudit(
      tx,
      access.user.id,
      "bulk_save",
      "attendance",
      undefined,
      `Attendance recorded for ${parsed.data.date} (${parsed.data.records.length} students).`,
    );
  });
  return NextResponse.json({ saved: parsed.data.records.length });
}