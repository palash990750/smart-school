import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { currentAcademicSession, parseJson } from "@/lib/school";

export const runtime = "nodejs";

const examRoles = [
    "SUPER_ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
] as const;

const subjectSchema = z.object({
    name: z.string().trim().min(1).max(100),
    code: z.string().trim().max(30).nullable().optional(),
    maxMarks: z.coerce.number().positive().max(100000),
    passMarks: z.coerce.number().min(0).max(100000),
});

type Context = {
    params: Promise<{ id: string }>;
};

export async function POST(
    request: Request,
    context: Context,
) {
    const access = await authorize([...examRoles]);

    if (!access.ok) {
        return access.response;
    }

    const { id } = await context.params;

    const parsed = await parseJson(
        request,
        subjectSchema,
    );

    if ("response" in parsed) {
        return parsed.response;
    }

    const data = parsed.data;

    if (data.passMarks > data.maxMarks) {
        return NextResponse.json(
            {
                error:
                    "Pass marks cannot exceed maximum marks.",
            },
            { status: 400 },
        );
    }

    const session =
        await currentAcademicSession();

    if (!session) {
        return NextResponse.json(
            {
                error:
                    "Complete school setup first.",
            },
            { status: 409 },
        );
    }

    try {
        const exam =
            await prisma.exam.findFirst({
                where: {
                    id,
                    sessionId: session.id,
                },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    classId: true,
                },
            });

        if (!exam) {
            return NextResponse.json(
                {
                    error: "Exam not found.",
                },
                { status: 404 },
            );
        }

        if (
            exam.status === "PUBLISHED" ||
            exam.status === "COMPLETED"
        ) {
            return NextResponse.json(
                {
                    error:
                        exam.status === "COMPLETED"
                            ? "Completed exams cannot be edited."
                            : "Published exams cannot be edited.",
                },
                { status: 409 },
            );
        }

        /*
         * Prevent the same subject from being added twice
         * to the same exam.
         */
        const existingSubject =
            await prisma.examSubject.findFirst({
                where: {
                    examId: exam.id,
                    name: {
                        equals: data.name,
                        mode: "insensitive",
                    },
                },
                select: {
                    id: true,
                },
            });

        if (existingSubject) {
            return NextResponse.json(
                {
                    error:
                        "This subject is already added to this exam.",
                },
                { status: 409 },
            );
        }

        const subject =
            await prisma.examSubject.create({
                data: {
                    examId: exam.id,
                    name: data.name,
                    code: data.code || null,
                    maxMarks: data.maxMarks,
                    passMarks: data.passMarks,
                },
            });

        await writeAudit(
            prisma,
            access.user.id,
            "CREATE",
            "EXAM_SUBJECTS",
            subject.id,
            `Added subject "${subject.name}" to exam "${exam.name}"`,
        );

        return NextResponse.json(
            {
                item: {
                    ...subject,
                    maxMarks: Number(
                        subject.maxMarks,
                    ),
                    passMarks: Number(
                        subject.passMarks,
                    ),
                },
                message:
                    "Subject added successfully.",
            },
            { status: 201 },
        );
    } catch (error) {
        console.error(
            "Create exam subject error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    "Could not add the subject. Please try again.",
            },
            { status: 500 },
        );
    }
}