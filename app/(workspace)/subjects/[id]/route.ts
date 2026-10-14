import { NextResponse } from "next/server";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const subjectRoles = [
    "SUPER_ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
    "RECEPTIONIST",
] as const;

/* =========================================================
   CONTEXT
   ========================================================= */

type Context = {
    params: Promise<{
        id: string;
    }>;
};

/* =========================================================
   GET
   Get one class subject
   ========================================================= */

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
        const { id } = await context.params;

        const subject =
            await prisma.classSubject.findUnique({
                where: {
                    id,
                },
            });

        if (!subject) {
            return NextResponse.json(
                {
                    error: "Subject not found.",
                },
                {
                    status: 404,
                },
            );
        }

        return NextResponse.json({
            item: subject,
        });
    } catch (error) {
        console.error(
            "Get class subject error:",
            error,
        );

        return NextResponse.json(
            {
                error: "Could not load subject.",
            },
            {
                status: 500,
            },
        );
    }
}

/* =========================================================
   PATCH
   Update subject
   ========================================================= */

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
        const { id } = await context.params;

        const body =
            await request.json().catch(
                () => ({}),
            );

        const existing =
            await prisma.classSubject.findUnique({
                where: {
                    id,
                },
            });

        if (!existing) {
            return NextResponse.json(
                {
                    error: "Subject not found.",
                },
                {
                    status: 404,
                },
            );
        }

        /* -----------------------------------------------------
           NAME
           ----------------------------------------------------- */

        let name =
            existing.name;

        if (
            body?.name !== undefined
        ) {
            if (
                typeof body.name !==
                "string"
            ) {
                return NextResponse.json(
                    {
                        error:
                            "Subject name must be text.",
                    },
                    {
                        status: 400,
                    },
                );
            }

            name =
                body.name.trim();

            if (!name) {
                return NextResponse.json(
                    {
                        error:
                            "Subject name is required.",
                    },
                    {
                        status: 400,
                    },
                );
            }

            if (name.length > 100) {
                return NextResponse.json(
                    {
                        error:
                            "Subject name is too long.",
                    },
                    {
                        status: 400,
                    },
                );
            }
        }

        /* -----------------------------------------------------
           CODE
           ----------------------------------------------------- */

        let code =
            existing.code;

        if (
            body?.code !== undefined
        ) {
            if (
                body.code === null ||
                body.code === ""
            ) {
                code = null;
            } else if (
                typeof body.code ===
                "string"
            ) {
                code =
                    body.code.trim() ||
                    null;

                if (
                    code &&
                    code.length > 50
                ) {
                    return NextResponse.json(
                        {
                            error:
                                "Subject code is too long.",
                        },
                        {
                            status: 400,
                        },
                    );
                }
            } else {
                return NextResponse.json(
                    {
                        error:
                            "Subject code must be text.",
                    },
                    {
                        status: 400,
                    },
                );
            }
        }

        /* -----------------------------------------------------
           FULL MARKS
           ----------------------------------------------------- */

        let defaultMaxMarks =
            Number(
                existing.defaultMaxMarks,
            );

        if (
            body?.defaultMaxMarks !==
            undefined
        ) {
            defaultMaxMarks =
                Number(
                    body.defaultMaxMarks,
                );
        }

        if (
            !Number.isFinite(
                defaultMaxMarks,
            ) ||
            defaultMaxMarks <= 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "Full marks must be greater than 0.",
                },
                {
                    status: 400,
                },
            );
        }

        /* -----------------------------------------------------
           PASS MARKS
           ----------------------------------------------------- */

        let defaultPassMarks =
            Number(
                existing.defaultPassMarks,
            );

        if (
            body?.defaultPassMarks !==
            undefined
        ) {
            defaultPassMarks =
                Number(
                    body.defaultPassMarks,
                );
        }

        if (
            !Number.isFinite(
                defaultPassMarks,
            ) ||
            defaultPassMarks < 0 ||
            defaultPassMarks >
            defaultMaxMarks
        ) {
            return NextResponse.json(
                {
                    error:
                        "Pass marks must be between 0 and full marks.",
                },
                {
                    status: 400,
                },
            );
        }

        /* -----------------------------------------------------
           ACTIVE / INACTIVE
           ----------------------------------------------------- */

        let active =
            existing.active;

        if (
            body?.active !==
            undefined
        ) {
            if (
                typeof body.active !==
                "boolean"
            ) {
                return NextResponse.json(
                    {
                        error:
                            "Active must be true or false.",
                    },
                    {
                        status: 400,
                    },
                );
            }

            active =
                body.active;
        }

        /* -----------------------------------------------------
           DUPLICATE SUBJECT CHECK
           Same class cannot have two active
           subjects with same name.
           ----------------------------------------------------- */

        const duplicate =
            await prisma.classSubject.findFirst(
                {
                    where: {
                        id: {
                            not: id,
                        },

                        classId:
                            existing.classId,

                        name: {
                            equals: name,
                            mode: "insensitive",
                        },

                        active: true,
                    },
                },
            );

        if (
            duplicate &&
            active
        ) {
            return NextResponse.json(
                {
                    error:
                        "This subject already exists for this class.",
                },
                {
                    status: 409,
                },
            );
        }

        /* -----------------------------------------------------
           UPDATE
           ----------------------------------------------------- */

        const updated =
            await prisma.classSubject.update(
                {
                    where: {
                        id,
                    },

                    data: {
                        name,
                        code,
                        defaultMaxMarks,
                        defaultPassMarks,
                        active,
                    },
                },
            );

        /* -----------------------------------------------------
           AUDIT
           ----------------------------------------------------- */

        try {
            await writeAudit(
                prisma,
                access.user.id,
                "UPDATE",
                "CLASS_SUBJECTS",
                updated.id,
                `Updated subject "${updated.name}".`,
            );
        } catch (auditError) {
            console.error(
                "Subject audit error:",
                auditError,
            );
        }

        return NextResponse.json({
            ok: true,
            item: updated,
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

/* =========================================================
   DELETE
   IMPORTANT:
   We DO NOT physically delete the subject.
   We disable it so old exam records remain safe.
   ========================================================= */

export async function DELETE(
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
        const { id } = await context.params;

        const existing =
            await prisma.classSubject.findUnique({
                where: {
                    id,
                },
            });

        if (!existing) {
            return NextResponse.json(
                {
                    error: "Subject not found.",
                },
                {
                    status: 404,
                },
            );
        }

        const updated =
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

        try {
            await writeAudit(
                prisma,
                access.user.id,
                "DELETE",
                "CLASS_SUBJECTS",
                updated.id,
                `Disabled subject "${updated.name}".`,
            );
        } catch (auditError) {
            console.error(
                "Subject audit error:",
                auditError,
            );
        }

        return NextResponse.json({
            ok: true,
            item: updated,
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