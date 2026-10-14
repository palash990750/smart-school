import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { currentAcademicSession, startOfUtcDay, moneyNumber } from "@/lib/school";

export const runtime = "nodejs";

const monthStart = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export async function GET() {
  const access = await authorize();
  if (!access.ok) return access.response;

  const session = await currentAcademicSession();
  if (!session) {
    return NextResponse.json({ error: "Complete school setup first." }, { status: 409 });
  }

  const now = new Date();
  const today = startOfUtcDay(now);
  const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const thisMonth = monthStart(now);
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [
    students,
    teachers,
    staff,
    classes,
    attendanceToday,
    paymentsToday,
    paymentsMonth,
    feeCharges,
    paymentsInSession,
    expensesMonth,
    attendanceWeek,
    paymentsSixMonths,
    classRows,
  ] = await Promise.all([
    prisma.student.count({
      where: { status: "ACTIVE", enrollments: { some: { sessionId: session.id } } },
    }),
    prisma.teacher.count(),
    prisma.staff.count(),
    prisma.schoolClass.count({ where: { sessionId: session.id } }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { sessionId: session.id, date: today },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { sessionId: session.id, paidAt: { gte: today, lt: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { sessionId: session.id, paidAt: { gte: thisMonth } },
      _sum: { amount: true },
    }),
    prisma.feeCharge.findMany({
      where: { sessionId: session.id },
      select: { studentId: true, amount: true },
    }),
    prisma.payment.findMany({
      where: { sessionId: session.id },
      select: { studentId: true, amount: true },
    }),
    prisma.expense.aggregate({
      where: { sessionId: session.id, paidAt: { gte: thisMonth } },
      _sum: { amount: true },
    }),
    prisma.attendance.findMany({
      where: { sessionId: session.id, date: { gte: sevenDaysAgo, lte: today } },
      select: { date: true, status: true },
    }),
    prisma.payment.findMany({
      where: { sessionId: session.id, paidAt: { gte: sixMonthsAgo } },
      select: { paidAt: true, amount: true },
    }),
    prisma.schoolClass.findMany({
      where: { sessionId: session.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { enrollments: true } } },
    }),
  ]);

  const paidByStudent = new Map<string, number>();
  for (const payment of paymentsInSession) {
    paidByStudent.set(
      payment.studentId,
      (paidByStudent.get(payment.studentId) ?? 0) + moneyNumber(payment.amount),
    );
  }
  const outstandingFees = feeCharges.reduce(
    (sum, charge) =>
      sum + Math.max(0, moneyNumber(charge.amount) - (paidByStudent.get(charge.studentId) ?? 0)),
    0,
  );
  const countByStatus = new Map(attendanceToday.map((row) => [row.status, row._count._all]));

  const attendanceTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sevenDaysAgo.getTime() + index * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const value = attendanceWeek.filter(
      (record) =>
        record.date.toISOString().slice(0, 10) === key && record.status === "PRESENT",
    ).length;
    return {
      label: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(date),
      value,
    };
  });

  const feeCollectionTrend = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const nextMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
    const value = paymentsSixMonths
      .filter((payment) => payment.paidAt >= month && payment.paidAt < nextMonth)
      .reduce((sum, payment) => sum + moneyNumber(payment.amount), 0);
    return {
      label: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(month),
      value,
    };
  });

  const classCounts = await Promise.all(
    classRows.map(async (schoolClass) => ({
      className: schoolClass.name,
      count: await prisma.enrollment.count({
        where: {
          classId: schoolClass.id,
          sessionId: session.id,
          student: { status: "ACTIVE" },
        },
      }),
    })),
  );

  return NextResponse.json({
    summary: {
      students,
      teachers,
      staff,
      classes,
      presentToday: countByStatus.get("PRESENT") ?? 0,
      absentToday: countByStatus.get("ABSENT") ?? 0,
      lateToday: countByStatus.get("LATE") ?? 0,
      feeCollectedToday: moneyNumber(paymentsToday._sum.amount),
      feeCollectedMonth: moneyNumber(paymentsMonth._sum.amount),
      outstandingFees,
      expensesMonth: moneyNumber(expensesMonth._sum.amount),
    },
    attendanceTrend,
    feeCollectionTrend,
    classCounts,
  });
}