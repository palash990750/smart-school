import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const subjectRoles = [
    "SUPER_ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
] as const;

const updateSubjectSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1)
        .max(120),

    code: z
        .string()
        .trim()
        .max(50)
        .nullable()
        .optional(),

    defaultMaxMarks: z.coerce
        .number()
        .positive()
        .max(100000),

    defaultPassMarks: z.coerce
        .number()
        .min(0)
        .max(100000),

    active: z
        .boolean()
        .optional(),
});

type Context = {
    params: Promise<{
        id: string;
    }>;
};

/**
 * GET /api/class-subjects/[id]
 */
export async function GET(
    _request: Request,
    context: Context,
) {
    const access = await authorize([
        ...subjectRoles,
    ]);

    if (!access.ok) {
        return access.response;
    }

    try {
        const { id } =
            await context.params;

        const subject =
            await prisma.classSubject.findUnique(
                {
                    where: {
                        id,
                    },
                    include: {
                        class: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            );

        if (!subject) {
            return NextResponse.json(
                {
                    error:
                        "Subject not found.",
                },
                {
                    status: 404,
                },
            );
        }

        return NextResponse.json({
            item: {
                ...subject,
                defaultMaxMarks:
                    Number(
                        subject.defaultMaxMarks,
                    ),
                defaultPassMarks:
                    Number(
                        subject.defaultPassMarks,
                    ),
            },
        });
    } catch (error) {
        console.error(
            "Get class subject error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    "Could not load subject.",
            },
            {
                status: 500,
            },
        );
    }
}

/**
 * PATCH /api/class-subjects/[id]
 *
 * Edit / save subject.
 *
 * Existing subject record is updated.
 * No delete/reset operation.
 */
export async function PATCH(
    request: Request,
    context: Context,
) {
    const access = await authorize([
        ...subjectRoles,
    ]);

    if (!access.ok) {
        return access.response;
    }

    try {
        const { id } =
            await context.params;

        const body =
            await request.json();

        const parsed =
            updateSubjectSchema.safeParse(
                body,
            );

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error:
                        "Invalid subject data.",
                    details:
                        parsed.error.flatten(),
                },
                {
                    status: 400,
                },
            );
        }

        const data =
            parsed.data;

        if (
            data.defaultPassMarks >
            data.defaultMaxMarks
        ) {
            return NextResponse.json(
                {
                    error:
                        "Pass marks cannot be greater than maximum marks.",
                },
                {
                    status: 400,
                },
            );
        }

        const existingSubject =
            await prisma.classSubject.findUnique(
                {
                    where: {
                        id,
                    },
                },
            );

        if (!existingSubject) {
            return NextResponse.json(
                {
                    error:
                        "Subject not found.",
                },
                {
                    status: 404,
                },
            );
        }

        /*
         * Keep empty code as null.
         */
        const code =
            data.code &&
                data.code.trim().length > 0
                ? data.code.trim()
                : null;

        /*
         * Check duplicate subject name/code
         * inside the same class.
         */
        const duplicate =
            await prisma.classSubject.findFirst(
                {
                    where: {
                        classId:
                            existingSubject.classId,

                        id: {
                            not: id,
                        },

                        OR: [
                            {
                                name: {
                                    equals:
                                        data.name,
                                    mode: "insensitive",
                                },
                            },

                            ...(code
                                ? [
                                    {
                                        code: {
                                            equals: data.code,
                                            mode: "insensitive" as const,
                                        },
                                    },
                                ]
                                : []),
                        ],
                    },

                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            );

        if (duplicate) {
            return NextResponse.json(
                {
                    error:
                        "Another subject with the same name or code already exists in this class.",
                },
                {
                    status: 409,
                },
            );
        }

        const updatedSubject =
            await prisma.classSubject.update(
                {
                    where: {
                        id,
                    },

                    data: {
                        name:
                            data.name.trim(),

                        code,

                        defaultMaxMarks:
                            data.defaultMaxMarks,

                        defaultPassMarks:
                            data.defaultPassMarks,

                        ...(data.active !==
                            undefined
                            ? {
                                active:
                                    data.active,
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
                    },
                },
            );

        await writeAudit(
            prisma,
            access.user.id,
            "UPDATE",
            "CLASS_SUBJECTS",
            updatedSubject.id,
            `Updated subject "${updatedSubject.name}"`,
        );

        return NextResponse.json({
            item: {
                ...updatedSubject,

                defaultMaxMarks:
                    Number(
                        updatedSubject.defaultMaxMarks,
                    ),

                defaultPassMarks:
                    Number(
                        updatedSubject.defaultPassMarks,
                    ),
            },

            message:
                "Subject updated successfully.",
        });
    } catch (error) {
        console.error(
            "Update class subject error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Could not update subject.",
            },
            {
                status: 500,
            },
        );
    }
}

/**
 * DELETE /api/class-subjects/[id]
 *
 * Physical delete না করে subject disable করবে।
 */
export async function DELETE(
    request: Request,
    context: Context,
) {
    const access = await authorize([
        ...subjectRoles,
    ]);

    if (!access.ok) {
        return access.response;
    }

    try {
        const { id } =
            await context.params;

        const existingSubject =
            await prisma.classSubject.findUnique(
                {
                    where: {
                        id,
                    },
                },
            );

        if (!existingSubject) {
            return NextResponse.json(
                {
                    error:
                        "Subject not found.",
                },
                {
                    status: 404,
                },
            );
        }

        const updatedSubject =
            await prisma.classSubject.update(
                {
                    where: {
                        id,
                    },

                    data: {
                        active: false,
                    },
                },
            );

        await writeAudit(
            prisma,
            access.user.id,
            "UPDATE",
            "CLASS_SUBJECTS",
            updatedSubject.id,
            `Disabled subject "${updatedSubject.name}"`,
        );

        return NextResponse.json({
            item: updatedSubject,
            message:
                "Subject disabled successfully.",
        });
    } catch (error) {
        console.error(
            "Delete class subject error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Could not disable subject.",
            },
            {
                status: 500,
            },
        );
    }
}