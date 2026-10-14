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

const examSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2)
        .max(120),

    examType: z
        .string()
        .trim()
        .min(1)
        .max(40),

    classId: z
        .string()
        .min(1),

    sectionId: z
        .string()
        .min(1)
        .nullable()
        .optional(),

    startDate: z
        .string()
        .min(1),

    endDate: z
        .string()
        .min(1),

    totalMarks: z
        .coerce
        .number()
        .positive()
        .max(100000),

    remarks: z
        .string()
        .trim()
        .max(1000)
        .nullable()
        .optional(),
});

type Context = {
    params: Promise<{
        id: string;
    }>;
};

function parseDate(
    value: string,
): Date | null {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            value,
        )
    ) {
        return null;
    }

    const date = new Date(
        `${value}T00:00:00.000Z`,
    );

    if (
        Number.isNaN(
            date.getTime(),
        ) ||
        date.toISOString().slice(
            0,
            10,
        ) !== value
    ) {
        return null;
    }

    return date;
}

function serializeExam<
    T extends {
        totalMarks: unknown;

        subjects: Array<{
            maxMarks: unknown;
            passMarks: unknown;
        }>;
    },
>(exam: T) {
    return {
        ...exam,

        totalMarks: Number(
            exam.totalMarks,
        ),

        subjects: exam.subjects.map(
            (subject) => ({
                ...subject,

                maxMarks: Number(
                    subject.maxMarks,
                ),

                passMarks: Number(
                    subject.passMarks,
                ),
            }),
        ),
    };
}

/**
 * GET /api/exams/[id]
 *
 * একটি পরীক্ষার সম্পূর্ণ তথ্য দেখাবে।
 */
export async function GET(
    _request: Request,
    context: Context,
) {
    const access = await authorize([
        ...examRoles,
    ]);

    if (!access.ok) {
        return access.response;
    }

    try {
        const { id } =
            await context.params;

        const session =
            await currentAcademicSession();

        if (!session) {
            return NextResponse.json(
                {
                    error:
                        "Complete school setup first.",
                },
                {
                    status: 409,
                },
            );
        }

        const exam =
            await prisma.exam.findFirst({
                where: {
                    id,
                    sessionId:
                        session.id,
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
            });

        if (!exam) {
            return NextResponse.json(
                {
                    error:
                        "Exam not found.",
                },
                {
                    status: 404,
                },
            );
        }

        return NextResponse.json({
            item: serializeExam(
                exam,
            ),
        });
    } catch (error) {
        console.error(
            "Get exam error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    "Could not load exam details.",
            },
            {
                status: 500,
            },
        );
    }
}

/**
 * PATCH /api/exams/[id]
 *
 * পরীক্ষার সাধারণ তথ্য আপডেট করবে।
 *
 * DRAFT:
 * - সব সাধারণ তথ্য Edit করা যাবে।
 *
 * PUBLISHED:
 * - সাধারণ তথ্য Edit করা যাবে।
 * - বিশেষ করে exam date পিছিয়ে দেওয়া যাবে।
 * - Status PUBLISHED-ই থাকবে।
 * - Existing ExamSubject / results untouched.
 *
 * COMPLETED:
 * - Edit করা যাবে না।
 */
export async function PATCH(
    request: Request,
    context: Context,
) {
    const access = await authorize([
        ...examRoles,
    ]);

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

    const startDate = parseDate(
        data.startDate,
    );

    const endDate = parseDate(
        data.endDate,
    );

    if (!startDate || !endDate) {
        return NextResponse.json(
            {
                error:
                    "Please provide valid start and end dates.",
            },
            {
                status: 400,
            },
        );
    }

    if (endDate < startDate) {
        return NextResponse.json(
            {
                error:
                    "End date cannot be before start date.",
            },
            {
                status: 400,
            },
        );
    }

    try {
        const { id } =
            await context.params;

        const session =
            await currentAcademicSession();

        if (!session) {
            return NextResponse.json(
                {
                    error:
                        "Complete school setup first.",
                },
                {
                    status: 409,
                },
            );
        }

        const existingExam =
            await prisma.exam.findFirst({
                where: {
                    id,
                    sessionId:
                        session.id,
                },

                select: {
                    id: true,
                    name: true,
                    status: true,
                },
            });

        if (!existingExam) {
            return NextResponse.json(
                {
                    error:
                        "Exam not found.",
                },
                {
                    status: 404,
                },
            );
        }

        /*
         * Only COMPLETED exams are locked.
         *
         * PUBLISHED exams can be edited.
         * This allows the exam date to be postponed
         * without unpublishing the exam.
         */
        if (
            existingExam.status ===
            "COMPLETED"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Completed exams cannot be edited.",
                },
                {
                    status: 409,
                },
            );
        }

        const schoolClass =
            await prisma.schoolClass.findFirst(
                {
                    where: {
                        id: data.classId,
                        sessionId:
                            session.id,
                    },

                    select: {
                        id: true,
                    },
                },
            );

        if (!schoolClass) {
            return NextResponse.json(
                {
                    error:
                        "Selected class was not found in the current session.",
                },
                {
                    status: 400,
                },
            );
        }

        const sectionId =
            data.sectionId || null;

        if (sectionId) {
            const section =
                await prisma.section.findFirst(
                    {
                        where: {
                            id: sectionId,
                            classId:
                                schoolClass.id,
                        },

                        select: {
                            id: true,
                        },
                    },
                );

            if (!section) {
                return NextResponse.json(
                    {
                        error:
                            "Selected section does not belong to this class.",
                    },
                    {
                        status: 400,
                    },
                );
            }
        }

        /*
         * Important:
         *
         * We intentionally do NOT send a "status" field here.
         *
         * Therefore:
         *
         * DRAFT    -> remains DRAFT
         * PUBLISHED -> remains PUBLISHED
         *
         * So if a Published exam date is moved,
         * it stays Published automatically.
         */
        const updatedExam =
            await prisma.exam.update({
                where: {
                    id: existingExam.id,
                },

                data: {
                    name:
                        data.name,

                    examType:
                        data.examType,

                    classId:
                        schoolClass.id,

                    sectionId,

                    startDate,

                    endDate,

                    totalMarks:
                        data.totalMarks,

                    remarks:
                        data.remarks ||
                        null,
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
            });

        await writeAudit(
            prisma,
            access.user.id,
            "UPDATE",
            "EXAMS",
            updatedExam.id,
            `Updated exam "${updatedExam.name}"`,
        );

        return NextResponse.json({
            item: serializeExam(
                updatedExam,
            ),

            message:
                existingExam.status ===
                    "PUBLISHED"
                    ? "Published exam updated successfully."
                    : "Exam updated successfully.",
        });
    } catch (error) {
        console.error(
            "Update exam error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    "Could not update exam.",
            },
            {
                status: 500,
            },
        );
    }
}

/**
 * POST /api/exams/[id]
 *
 * Publish exam.
 *
 * Annual / Final exam-এর কোনো ExamSubject না থাকলে
 * selected class-এর active ClassSubject থেকে
 * ExamSubject automatically তৈরি করবে।
 */
export async function POST(
    request: Request,
    context: Context,
) {
    const access = await authorize([
        ...examRoles,
    ]);

    if (!access.ok) {
        return access.response;
    }

    try {
        const { id } =
            await context.params;

        const session =
            await currentAcademicSession();

        if (!session) {
            return NextResponse.json(
                {
                    error:
                        "No active academic session found.",
                },
                {
                    status: 400,
                },
            );
        }

        const exam =
            await prisma.exam.findFirst({
                where: {
                    id,
                    sessionId:
                        session.id,
                },

                include: {
                    subjects: true,
                },
            });

        if (!exam) {
            return NextResponse.json(
                {
                    error:
                        "Exam not found.",
                },
                {
                    status: 404,
                },
            );
        }

        if (
            exam.status ===
            "PUBLISHED"
        ) {
            return NextResponse.json({
                item: serializeExam(
                    exam,
                ),
                message:
                    "Exam is already published.",
            });
        }

        if (
            exam.status ===
            "COMPLETED"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Completed exams cannot be published again.",
                },
                {
                    status: 400,
                },
            );
        }

        if (
            exam.status !==
            "DRAFT"
        ) {
            return NextResponse.json(
                {
                    error:
                        `Exam cannot be published from status "${exam.status}".`,
                },
                {
                    status: 400,
                },
            );
        }

        const examType =
            String(
                exam.examType ??
                "",
            )
                .trim()
                .toUpperCase();

        const isAnnualOrFinal =
            examType === "ANNUAL" ||
            examType === "FINAL" ||
            examType.includes(
                "ANNUAL",
            ) ||
            examType.includes(
                "FINAL",
            );

        if (
            isAnnualOrFinal &&
            exam.subjects.length ===
            0
        ) {
            const classSubjects =
                await prisma.classSubject.findMany(
                    {
                        where: {
                            classId:
                                exam.classId,

                            active: true,
                        },

                        orderBy: {
                            name: "asc",
                        },
                    },
                );

            if (
                classSubjects.length ===
                0
            ) {
                return NextResponse.json(
                    {
                        error:
                            "No subjects are assigned to this class. Please add subjects from Subjects management first.",
                    },
                    {
                        status: 400,
                    },
                );
            }

            const totalMarks =
                classSubjects.reduce(
                    (
                        total,
                        subject,
                    ) => {
                        return (
                            total +
                            Number(
                                subject.defaultMaxMarks,
                            )
                        );
                    },
                    0,
                );

            await prisma.$transaction(
                async (tx) => {
                    await tx.examSubject.createMany(
                        {
                            data:
                                classSubjects.map(
                                    (
                                        subject,
                                    ) => ({
                                        examId:
                                            exam.id,

                                        name:
                                            subject.name,

                                        code:
                                            subject.code,

                                        maxMarks:
                                            subject.defaultMaxMarks,

                                        passMarks:
                                            subject.defaultPassMarks,
                                    }),
                                ),
                        },
                    );

                    if (
                        totalMarks >
                        0
                    ) {
                        await tx.exam.update(
                            {
                                where: {
                                    id:
                                        exam.id,
                                },

                                data: {
                                    totalMarks:
                                        totalMarks,
                                },
                            },
                        );
                    }
                },
            );
        }

        const subjects =
            await prisma.examSubject.findMany(
                {
                    where: {
                        examId:
                            exam.id,
                    },

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
            );

        if (
            isAnnualOrFinal &&
            subjects.length ===
            0
        ) {
            return NextResponse.json(
                {
                    error:
                        "Add at least one subject before publishing the Annual/Final exam.",
                },
                {
                    status: 400,
                },
            );
        }

        const publishedExam =
            await prisma.exam.update({
                where: {
                    id: exam.id,
                },

                data: {
                    status:
                        "PUBLISHED",
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
            });

        await writeAudit(
            prisma,
            access.user.id,
            "UPDATE",
            "EXAMS",
            publishedExam.id,
            `Published exam "${publishedExam.name}"`,
        );

        return NextResponse.json({
            item: serializeExam(
                publishedExam,
            ),

            message:
                "Exam published successfully.",
        });
    } catch (error) {
        console.error(
            "Publish exam error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Could not publish exam.",
            },
            {
                status: 500,
            },
        );
    }
}