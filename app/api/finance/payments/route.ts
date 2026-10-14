import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { currentAcademicSession, moneyNumber, parseJson } from "@/lib/school";

export const runtime = "nodejs";

const paymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.coerce.number().positive().max(1_000_000_000),
  method: z.enum(["cash", "upi", "card", "bank_transfer", "cheque", "online"]),
  transactionId: z.string().trim().max(120).nullable().optional(),
});

const dbMethod = {
  cash: "CASH",
  upi: "UPI",
  card: "CARD",
  bank_transfer: "BANK_TRANSFER",
  cheque: "CHEQUE",
  online: "ONLINE",
} as const;
const financeRoles = ["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "ACCOUNTANT"] as const;

export async function GET(request: Request) {
  const access = await authorize([...financeRoles]);
  if (!access.ok) return access.response;
  const session = await currentAcademicSession();
  if (!session) return NextResponse.json({ error: "Complete school setup first." }, { status: 409 });
  const search = new URL(request.url).searchParams.get("search")?.trim();
  const rows = await prisma.payment.findMany({
    where: {
      sessionId: session.id,
      ...(search
        ? {
            OR: [
              { receiptNumber: { contains: search, mode: "insensitive" } },
              { transactionId: { contains: search, mode: "insensitive" } },
              { student: { admissionNumber: { contains: search, mode: "insensitive" } } },
              { student: { firstName: { contains: search, mode: "insensitive" } } },
              { student: { lastName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { student: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { paidAt: "desc" },
    take: 500,
  });
  return NextResponse.json(
    rows.map((payment) => ({
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      studentId: payment.studentId,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`.trim(),
      amount: moneyNumber(payment.amount),
      paidAt: payment.paidAt.toISOString(),
      method: payment.method.toLowerCase(),
      transactionId: payment.transactionId,
    })),
  );
}

export async function POST(request: Request) {
  const access = await authorize([...financeRoles]);
  if (!access.ok) return access.response;
  const parsed = await parseJson(request, paymentSchema);
  if ("response" in parsed) return parsed.response;
  const session = await currentAcademicSession();
  if (!session) return NextResponse.json({ error: "Complete school setup first." }, { status: 409 });

  try {
    const payment = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext('${String(parsed.data.studentId).replace(/'/g, "''")}'))`
      );
      const student = await tx.student.findFirst({
        where: {
          id: parsed.data.studentId,
          status: "ACTIVE",
          enrollments: { some: { sessionId: session.id } },
        },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!student) throw new Error("STUDENT_NOT_FOUND");
      const charge = await tx.feeCharge.findUnique({
        where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
      });
      if (!charge) throw new Error("FEE_NOT_ASSIGNED");
      const paid = await tx.payment.aggregate({
        where: { studentId: student.id, sessionId: session.id },
        _sum: { amount: true },
      });
      const balance = charge.amount.toNumber() - (paid._sum.amount?.toNumber() ?? 0);
      if (parsed.data.amount - balance > 0.005) throw new Error("PAYMENT_EXCEEDS_BALANCE");

      const created = await tx.payment.create({
        data: {
          receiptNumber: `SS-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
          studentId: student.id,
          sessionId: session.id,
          amount: parsed.data.amount.toFixed(2),
          method: dbMethod[parsed.data.method],
          transactionId: parsed.data.transactionId || null,
          recordedById: access.user.id,
        },
      });
      await writeAudit(
        tx,
        access.user.id,
        "record",
        "payments",
        created.id,
        `Payment ${created.receiptNumber} recorded for ${student.firstName} ${student.lastName}.`,
      );
      return {
        id: created.id,
        receiptNumber: created.receiptNumber,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        amount: moneyNumber(created.amount),
        paidAt: created.paidAt.toISOString(),
        method: created.method.toLowerCase(),
        transactionId: created.transactionId,
      };
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const messages: Record<string, [number, string]> = {
      STUDENT_NOT_FOUND: [404, "Student not found in the current academic session."],
      FEE_NOT_ASSIGNED: [400, "Assign a fee amount to this student before recording a payment."],
      PAYMENT_EXCEEDS_BALANCE: [400, "The payment is greater than the student's outstanding balance."],
    };
    const result = messages[error.message];
    if (result) return NextResponse.json({ error: result[1] }, { status: result[0] });
    throw error;
  }
}