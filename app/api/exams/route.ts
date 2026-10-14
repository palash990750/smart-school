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

const examSubjectSchema = z.object({
    classSubjectId: z.string().min(1),
    maxMarks: z.coerce.number().positive().max(100000),
    passMarks: z.coerce.number().min(0).max(100000),
});

const examSchema = z.object({
    name: z.string().trim().min(2).max(120),
    examType: z.string().trim().min(1).max(40).default("TERM"),
    classId: z.string().min(1),
    sectionId: z.string().min(1).nullable().optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    totalMarks: z.coerce.number().positive().max(100000),
    remarks: z.string().trim().max(1000).nullable().optional(),
});

function serializeExam(exam: any) {
    return {
        ...exam,
        totalMarks: Number(exam.totalMarks),
        subjects: exam.subjects.map((subject: any) => ({
            ...subject,
            maxMarks: Number(subject.maxMarks),
            passMarks: Number(subject.passMarks),
        })),
    };
}

/**
 * Automatically changes expired PUBLISHED exams to COMPLETED.
 *
 * Important:
 * - DRAFT exams are untouched.
 * - PUBLISHED exams whose endDate has passed become COMPLETED.
 * - COMPLETED exams remain COMPLETED.
 * - No exam, subject, result or other data is deleted.
 */
async function completeExpiredExams(sessionId: string) {
    const now = new Date();

    await prisma.exam.updateMany({
        where: {
            sessionId,
            status: "PUBLISHED",
            endDate: {
                lt: now,
            },
        },
        data: {
            status: "COMPLETED",
        },
    });
}

export async function GET(request: Request) {
    const access = await authorize([...examRoles]);

    if (!access.ok) {
        return access.response;
    }

    try {
        const session = await currentAcademicSession();

        if (!session) {
            return NextResponse.json(
                {
                    error: "Complete school setup first.",
                },
                { status: 409 },
            );
        }

        /*
         * Automatically complete expired published exams
         * before loading the list.
         */
        await completeExpiredExams(session.id);

        const search = new URL(request.url)
            .searchParams
            .get("search")
            ?.trim();

        const exams = await prisma.exam.findMany({
            where: {
                sessionId: session.id,

                ...(search
                    ? {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    }
                    : {}),
            },

            include: {
                class: {
                    select: {
                        id: true,
                        name: true,
                    },
                },

                section: {
                    select: {
                        id: true,
                        name: true,
                    },
                },

                subjects: {
                    orderBy: {
                        name: "asc",
                    },

                    include: {
                        _count: {
                            select: {
                                results: true,
                            },
                        },
                    },
                },
            },

            orderBy: {
                startDate: "desc",
            },

            take: 300,
        });

        return NextResponse.json({
            session: {
                id: session.id,
                name: session.name,
            },

            items: exams.map(serializeExam),
        });
    } catch (error) {
        console.error("Get exams error:", error);

        return NextResponse.json(
            {
                error: "Could not load exams.",
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    const access = await authorize([...examRoles]);

    if (!access.ok) {
        return access.response;
    }

    const parsed = await parseJson(
        request,
        examSchema,
    );

    if ("response" in parsed) {
        return parsed.response;
    }

    const data = parsed.data;

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

    const startDate = new Date(
        `${data.startDate}T00:00:00.000Z`,
    );

    const endDate = new Date(
        `${data.endDate}T00:00:00.000Z`,
    );

    if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        endDate < startDate
    ) {
        return NextResponse.json(
            {
                error:
                    "End date must be on or after the start date.",
            },
            { status: 400 },
        );
    }

    const schoolClass =
        await prisma.schoolClass.findFirst({
            where: {
                id: data.classId,
                sessionId: session.id,
            },

            select: {
                id: true,
            },
        });

    if (!schoolClass) {
        return NextResponse.json(
            {
                error:
                    "Selected class does not belong to the current academic session.",
            },
            { status: 400 },
        );
    }

    if (data.sectionId) {
        const section =
            await prisma.section.findFirst({
                where: {
                    id: data.sectionId,
                    classId: data.classId,
                },

                select: {
                    id: true,
                },
            });

        if (!section) {
            return NextResponse.json(
                {
                    error:
                        "Selected section does not belong to this class.",
                },
                { status: 400 },
            );
        }
    }

    try {
        const exam = await prisma.exam.create({
            data: {
                name: data.name,
                examType: data.examType,

                sessionId: session.id,

                classId: data.classId,

                sectionId:
                    data.sectionId || null,

                startDate,
                endDate,

                totalMarks:
                    data.totalMarks,

                remarks:
                    data.remarks || null,

                status: "DRAFT",
            },

            include: {
                class: {
                    select: {
                        id: true,
                        name: true,
                    },
                },

                section: {
                    select: {
                        id: true,
                        name: true,
                    },
                },

                subjects: true,
            },
        });

        await writeAudit(
            prisma,
            access.user.id,
            "CREATE",
            "EXAMS",
            exam.id,
            `Created exam "${exam.name}"`,
        );

        return NextResponse.json(
            serializeExam(exam),
            {
                status: 201,
            },
        );
    } catch (error) {
        console.error(
            "Create exam error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    "Could not create the exam. Please try again.",
            },
            { status: 500 },
        );
    }
}