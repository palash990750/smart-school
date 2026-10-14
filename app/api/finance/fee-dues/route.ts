import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { currentAcademicSession, moneyNumber } from "@/lib/school";

export const runtime = "nodejs";

const financeRoles = ["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "ACCOUNTANT"] as const;

export async function GET(request: Request) {
  const access = await authorize([...financeRoles]);
  if (!access.ok) return access.response;
  const session = await currentAcademicSession();
  if (!session) return NextResponse.json({ error: "Complete school setup first." }, { status: 409 });
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim().toLowerCase();
  const classId = url.searchParams.get("classId") || undefined;

  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      enrollments: {
        some: {
          sessionId: session.id,
          ...(classId ? { classId } : {}),
        },
      },
    },
    include: {
      enrollments: {
        where: { sessionId: session.id },
        include: { class: { select: { name: true } }, section: { select: { name: true } } },
      },
      feeCharges: { where: { sessionId: session.id }, select: { amount: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const studentIds = students.map((student) => student.id);
  const paymentGroups = studentIds.length
    ? await prisma.payment.groupBy({
        by: ["studentId"],
        where: { sessionId: session.id, studentId: { in: studentIds } },
        _sum: { amount: true },
      })
    : [];
  const paidByStudent = new Map(
    paymentGroups.map((group) => [group.studentId, moneyNumber(group._sum.amount)]),
  );

  const rows = students.map((student) => {
    const enrollment = student.enrollments[0];
    const total = student.feeCharges.reduce((sum, fee) => sum + moneyNumber(fee.amount), 0);
    const paid = paidByStudent.get(student.id) ?? 0;
    return {
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      className: enrollment?.class.name ?? "",
      sectionName: enrollment?.section.name ?? "",
      total,
      paid,
      due: Math.max(0, total - paid),
    };
  });
  const filtered = search
    ? rows.filter((row) =>
        [row.studentName, row.admissionNumber, row.className, row.sectionName]
          .join(" ")
          .toLowerCase()
          .includes(search),
      )
    : rows;
  return NextResponse.json(filtered);
}