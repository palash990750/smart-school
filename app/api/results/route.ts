import { NextResponse } from "next/server";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { currentAcademicSession } from "@/lib/school";

export const runtime = "nodejs";

const roles = [
    "SUPER_ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "RECEPTIONIST",
    "ACCOUNTANT",
] as const;

function gradeForPercentage(value: number) {
    if (value >= 90) return "A+";
    if (value >= 80) return "A";
    if (value >= 70) return "B+";
    if (value >= 60) return "B";
    if (value >= 50) return "C";
    if (value >= 40) return "D";
    if (value >= 33) return "E";
    return "F";
}

export async function GET(request: Request) {
    const access = await authorize([...roles]);

    if (!access.ok) {
        return access.response;
    }

    const session = await currentAcademicSession();

    if (!session) {
        return NextResponse.json(
            { error: "Complete school setup first." },
            { status: 409 },
        );
    }

    const url = new URL(request.url);
    const examId = url.searchParams.get("examId");

    if (!examId) {
        return NextResponse.json({ items: [] });
    }

    const exam = await prisma.exam.findFirst({
        where: {
            id: examId,
            sessionId: session.id,
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
                    createdAt: "asc",
                },
            },
        },
    });

    if (!exam) {
        return NextResponse.json(
            { error: "Exam not found." },
            { status: 404 },
        );
    }

    const enrollments = await prisma.enrollment.findMany({
        where: {
            sessionId: session.id,
            classId: exam.classId,
            ...(exam.sectionId
                ? { sectionId: exam.sectionId }
                : {}),
            student: {
                status: "ACTIVE",
            },
        },
        orderBy: [
            {
                rollNumber: "asc",
            },
            {
                student: {
                    lastName: "asc",
                },
            },
            {
                student: {
                    firstName: "asc",
                },
            },
        ],
        include: {
            student: {
                select: {
                    id: true,
                    admissionNumber: true,
                    firstName: true,
                    lastName: true,
                },
            },
            section: {
                select: {
                    id: true,
                    name: true,
                },
            },
            class: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    const studentIds = enrollments.map(
        (entry) => entry.studentId,
    );

    const results =
        studentIds.length && exam.subjects.length
            ? await prisma.examResult.findMany({
                where: {
                    studentId: {
                        in: studentIds,
                    },
                    examSubjectId: {
                        in: exam.subjects.map(
                            (subject) => subject.id,
                        ),
                    },
                },
            })
            : [];

    const resultMap = new Map(
        results.map((result) => [
            `${result.studentId}:${result.examSubjectId}`,
            {
                marks: Number(result.marksObtained),
                remarks: result.remarks ?? "",
            },
        ]),
    );

    const items = enrollments.map((enrollment) => {
        const subjectRows = exam.subjects.map((subject) => {
            const value = resultMap.get(
                `${enrollment.studentId}:${subject.id}`,
            );

            return {
                examSubjectId: subject.id,
                name: subject.name,
                code: subject.code,
                maxMarks: Number(subject.maxMarks),
                passMarks: Number(subject.passMarks),
                marks: value?.marks ?? null,
                remarks: value?.remarks ?? "",
            };
        });

        const entered = subjectRows.filter(
            (row) => row.marks !== null,
        );

        const total = entered.reduce(
            (sum, row) => sum + (row.marks ?? 0),
            0,
        );

        const maxTotal = subjectRows.reduce(
            (sum, row) => sum + row.maxMarks,
            0,
        );

        const percentage = maxTotal
            ? (total / maxTotal) * 100
            : 0;

        const passed =
            entered.length === subjectRows.length &&
            subjectRows.every(
                (row) =>
                    (row.marks ?? 0) >= row.passMarks,
            );

        return {
            studentId: enrollment.studentId,
            enrollmentId: enrollment.id,
            admissionNumber:
                enrollment.student.admissionNumber,
            name: `${enrollment.student.firstName} ${enrollment.student.lastName}`.trim(),
            rollNumber: enrollment.rollNumber,
            className: enrollment.class.name,
            sectionName: enrollment.section.name,
            subjects: subjectRows,
            total,
            maxTotal,
            percentage: Number(
                percentage.toFixed(2),
            ),
            grade:
                entered.length === subjectRows.length
                    ? gradeForPercentage(percentage)
                    : "—",
            result:
                entered.length === subjectRows.length
                    ? passed
                        ? "PASS"
                        : "FAIL"
                    : "PENDING",
        };
    });

    return NextResponse.json({
        exam: {
            id: exam.id,
            name: exam.name,
            examType: exam.examType,
            startDate: exam.startDate.toISOString(),
            endDate: exam.endDate.toISOString(),
            status: exam.status,
            class: exam.class,
            section: exam.section,
            subjects: exam.subjects.map((subject) => ({
                id: subject.id,
                name: subject.name,
                code: subject.code,
                maxMarks: Number(subject.maxMarks),
                passMarks: Number(subject.passMarks),
            })),
        },
        items,
    });
}

/**
 * POST
 *
 * Frontend format:
 *
 * {
 *   examId: "...",
 *   results: [
 *     {
 *       studentId: "...",
 *       enrollmentId: "...",
 *       examSubjectId: "...",
 *       marksObtained: 75
 *     }
 *   ]
 * }
 */
export async function POST(request: Request) {
    const access = await authorize([...roles]);

    if (!access.ok) {
        return access.response;
    }

    const session = await currentAcademicSession();

    if (!session) {
        return NextResponse.json(
            {
                error:
                    "Complete school setup first.",
            },
            { status: 409 },
        );
    }

    let body: any;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            {
                error: "Invalid JSON body.",
            },
            { status: 400 },
        );
    }

    const examId =
        typeof body?.examId === "string"
            ? body.examId.trim()
            : "";

    const results = Array.isArray(body?.results)
        ? body.results
        : [];

    if (!examId) {
        return NextResponse.json(
            {
                error: "Exam ID is required.",
            },
            { status: 400 },
        );
    }

    if (!results.length) {
        return NextResponse.json(
            {
                error:
                    "No result entries were provided.",
            },
            { status: 400 },
        );
    }

    const exam = await prisma.exam.findFirst({
        where: {
            id: examId,
            sessionId: session.id,
        },
        include: {
            subjects: true,
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

    const subjectMap = new Map(
        exam.subjects.map((subject) => [
            subject.id,
            subject,
        ]),
    );

    try {
        const saved = await prisma.$transaction(
            async (tx) => {
                let count = 0;

                for (const entry of results) {
                    const studentId =
                        typeof entry?.studentId ===
                            "string"
                            ? entry.studentId.trim()
                            : "";

                    const enrollmentId =
                        typeof entry?.enrollmentId ===
                            "string"
                            ? entry.enrollmentId.trim()
                            : "";

                    const examSubjectId =
                        typeof entry?.examSubjectId ===
                            "string"
                            ? entry.examSubjectId.trim()
                            : "";

                    if (
                        !studentId ||
                        !enrollmentId ||
                        !examSubjectId
                    ) {
                        throw new Error(
                            "Student, enrollment and subject are required.",
                        );
                    }

                    const subject =
                        subjectMap.get(
                            examSubjectId,
                        );

                    if (!subject) {
                        throw new Error(
                            "Invalid exam subject.",
                        );
                    }

                    const enrollment =
                        await tx.enrollment.findFirst({
                            where: {
                                id: enrollmentId,
                                studentId,
                                sessionId:
                                    session.id,
                                classId:
                                    exam.classId,
                                ...(exam.sectionId
                                    ? {
                                        sectionId:
                                            exam.sectionId,
                                    }
                                    : {}),
                            },
                        });

                    if (!enrollment) {
                        throw new Error(
                            `Invalid enrollment for student ${studentId}.`,
                        );
                    }

                    const marks = Number(
                        entry?.marksObtained,
                    );

                    if (
                        !Number.isFinite(marks) ||
                        marks < 0 ||
                        marks >
                        Number(
                            subject.maxMarks,
                        )
                    ) {
                        throw new Error(
                            `Invalid marks for ${subject.name}. Maximum marks: ${Number(
                                subject.maxMarks,
                            )}.`,
                        );
                    }

                    const remarks =
                        entry?.remarks !==
                            undefined &&
                            entry?.remarks !== null
                            ? String(
                                entry.remarks,
                            )
                                .trim()
                                .slice(0, 500)
                            : null;

                    await tx.examResult.upsert({
                        where: {
                            examSubjectId_studentId:
                            {
                                examSubjectId,
                                studentId,
                            },
                        },
                        update: {
                            enrollmentId,
                            marksObtained:
                                marks.toFixed(2),
                            remarks,
                        },
                        create: {
                            examSubjectId,
                            studentId,
                            enrollmentId,
                            marksObtained:
                                marks.toFixed(2),
                            remarks,
                        },
                    });

                    count += 1;
                }

                await writeAudit(
                    tx,
                    access.user.id,
                    "update",
                    "exam_results",
                    exam.id,
                    `Exam results saved for ${count} subject entries.`,
                );

                return count;
            },
        );

        return NextResponse.json({
            ok: true,
            saved,
            message:
                "Results saved successfully.",
        });
    } catch (error) {
        console.error(
            "POST /api/results error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Could not save results.",
            },
            { status: 400 },
        );
    }
}

/**
 * PUT
 *
 * Backward-compatible endpoint.
 * Existing code using:
 *
 * {
 *   examId,
 *   entries: [
 *     {
 *       studentId,
 *       enrollmentId,
 *       subjects: [...]
 *     }
 *   ]
 * }
 *
 * will continue to work.
 */
export async function PUT(request: Request) {
    const access = await authorize([...roles]);

    if (!access.ok) {
        return access.response;
    }

    const session = await currentAcademicSession();

    if (!session) {
        return NextResponse.json(
            {
                error:
                    "Complete school setup first.",
            },
            { status: 409 },
        );
    }

    let body: any;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            {
                error: "Invalid JSON body.",
            },
            { status: 400 },
        );
    }

    const examId =
        typeof body?.examId === "string"
            ? body.examId.trim()
            : "";

    const entries = Array.isArray(body?.entries)
        ? body.entries
        : [];

    if (!examId || !entries.length) {
        return NextResponse.json(
            {
                error:
                    "Exam and result entries are required.",
            },
            { status: 400 },
        );
    }

    const exam = await prisma.exam.findFirst({
        where: {
            id: examId,
            sessionId: session.id,
        },
        include: {
            subjects: true,
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

    const subjectMap = new Map(
        exam.subjects.map((subject) => [
            subject.id,
            subject,
        ]),
    );

    try {
        const saved = await prisma.$transaction(
            async (tx) => {
                let count = 0;

                for (const entry of entries) {
                    const studentId =
                        String(
                            entry?.studentId ?? "",
                        ).trim();

                    const enrollmentId =
                        String(
                            entry?.enrollmentId ?? "",
                        ).trim();

                    if (
                        !studentId ||
                        !enrollmentId
                    ) {
                        continue;
                    }

                    const enrollment =
                        await tx.enrollment.findFirst({
                            where: {
                                id: enrollmentId,
                                studentId,
                                sessionId:
                                    session.id,
                                classId:
                                    exam.classId,
                                ...(exam.sectionId
                                    ? {
                                        sectionId:
                                            exam.sectionId,
                                    }
                                    : {}),
                            },
                        });

                    if (!enrollment) {
                        continue;
                    }

                    const subjects = Array.isArray(
                        entry?.subjects,
                    )
                        ? entry.subjects
                        : [];

                    for (const row of subjects) {
                        const examSubjectId =
                            String(
                                row?.examSubjectId ??
                                "",
                            ).trim();

                        const subject =
                            subjectMap.get(
                                examSubjectId,
                            );

                        if (!subject) {
                            continue;
                        }

                        const marks = Number(
                            row?.marks,
                        );

                        if (
                            !Number.isFinite(
                                marks,
                            ) ||
                            marks < 0 ||
                            marks >
                            Number(
                                subject.maxMarks,
                            )
                        ) {
                            throw new Error(
                                `Invalid marks for ${subject.name}.`,
                            );
                        }

                        await tx.examResult.upsert({
                            where: {
                                examSubjectId_studentId:
                                {
                                    examSubjectId,
                                    studentId,
                                },
                            },
                            update: {
                                enrollmentId,
                                marksObtained:
                                    marks.toFixed(
                                        2,
                                    ),
                                remarks:
                                    row?.remarks
                                        ? String(
                                            row.remarks,
                                        )
                                            .trim()
                                            .slice(
                                                0,
                                                500,
                                            )
                                        : null,
                            },
                            create: {
                                examSubjectId,
                                studentId,
                                enrollmentId,
                                marksObtained:
                                    marks.toFixed(
                                        2,
                                    ),
                                remarks:
                                    row?.remarks
                                        ? String(
                                            row.remarks,
                                        )
                                            .trim()
                                            .slice(
                                                0,
                                                500,
                                            )
                                        : null,
                            },
                        });

                        count += 1;
                    }
                }

                await writeAudit(
                    tx,
                    access.user.id,
                    "update",
                    "exam_results",
                    exam.id,
                    `Exam results saved for ${count} subject entries.`,
                );

                return count;
            },
        );

        return NextResponse.json({
            ok: true,
            saved,
        });
    } catch (error) {
        console.error(
            "PUT /api/results error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Could not save results.",
            },
            { status: 400 },
        );
    }
}