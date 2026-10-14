import { NextResponse } from "next/server";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Context = {
    params: Promise<{
        id: string;
    }>;
};

const readRoles = [
    "SUPER_ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "RECEPTIONIST",
    "TEACHER",
] as const;

const writeRoles = [
    "SUPER_ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "RECEPTIONIST",
] as const;

function clean(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text ? text : null;
}

export async function GET(
    _request: Request,
    { params }: Context,
) {
    const access = await authorize([...readRoles]);

    if (!access.ok) {
        return access.response;
    }

    const { id } = await params;

    const parent = await prisma.parent.findUnique({
        where: {
            id,
        },
        include: {
            students: {
                select: {
                    id: true,
                    admissionNumber: true,
                    firstName: true,
                    lastName: true,
                    dateOfBirth: true,
                    gender: true,
                    phone: true,
                    photoUrl: true,
                    status: true,
                },
                orderBy: {
                    firstName: "asc",
                },
            },
        },
    });

    if (!parent) {
        return NextResponse.json(
            {
                error: "Parent / guardian not found.",
            },
            {
                status: 404,
            },
        );
    }

    return NextResponse.json(parent);
}

export async function PATCH(
    request: Request,
    { params }: Context,
) {
    const access = await authorize([...writeRoles]);

    if (!access.ok) {
        return access.response;
    }

    const { id } = await params;

    try {
        const body = await request.json();

        const existing = await prisma.parent.findUnique({
            where: {
                id,
            },
        });

        if (!existing) {
            return NextResponse.json(
                {
                    error: "Parent / guardian not found.",
                },
                {
                    status: 404,
                },
            );
        }

        const updated = await prisma.$transaction(async (tx) => {
            const parent = await tx.parent.update({
                where: {
                    id,
                },
                data: {
                    fatherName:
                        body.fatherName !== undefined
                            ? clean(body.fatherName)
                            : undefined,

                    fatherPhone:
                        body.fatherPhone !== undefined
                            ? clean(body.fatherPhone)
                            : undefined,

                    fatherOccupation:
                        body.fatherOccupation !== undefined
                            ? clean(body.fatherOccupation)
                            : undefined,

                    motherName:
                        body.motherName !== undefined
                            ? clean(body.motherName)
                            : undefined,

                    motherPhone:
                        body.motherPhone !== undefined
                            ? clean(body.motherPhone)
                            : undefined,

                    motherOccupation:
                        body.motherOccupation !== undefined
                            ? clean(body.motherOccupation)
                            : undefined,

                    guardianName:
                        body.guardianName !== undefined
                            ? clean(body.guardianName)
                            : undefined,

                    guardianPhone:
                        body.guardianPhone !== undefined
                            ? clean(body.guardianPhone)
                            : undefined,

                    guardianRelation:
                        body.guardianRelation !== undefined
                            ? clean(body.guardianRelation)
                            : undefined,

                    address:
                        body.address !== undefined
                            ? clean(body.address)
                            : undefined,

                    emergencyContact:
                        body.emergencyContact !== undefined
                            ? clean(body.emergencyContact)
                            : undefined,
                },
                include: {
                    students: true,
                },
            });

            await writeAudit(
                tx,
                access.user.id,
                "edit",
                "parents",
                id,
                "Parent / guardian record updated.",
            );

            return parent;
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("UPDATE PARENT ERROR:", error);

        return NextResponse.json(
            {
                error: "Parent / guardian record could not be updated.",
            },
            {
                status: 500,
            },
        );
    }
}

export async function DELETE(
    _request: Request,
    { params }: Context,
) {
    const access = await authorize([
        "SUPER_ADMIN",
        "PRINCIPAL",
        "VICE_PRINCIPAL",
    ]);

    if (!access.ok) {
        return access.response;
    }

    const { id } = await params;

    const parent = await prisma.parent.findUnique({
        where: {
            id,
        },
        include: {
            students: {
                select: {
                    id: true,
                },
            },
        },
    });

    if (!parent) {
        return NextResponse.json(
            {
                error: "Parent / guardian not found.",
            },
            {
                status: 404,
            },
        );
    }

    if (parent.students.length > 0) {
        return NextResponse.json(
            {
                error:
                    "This parent is linked to students. Unlink the students before deleting the parent record.",
            },
            {
                status: 409,
            },
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.parent.delete({
            where: {
                id,
            },
        });

        await writeAudit(
            tx,
            access.user.id,
            "delete",
            "parents",
            id,
            "Parent / guardian record deleted.",
        );
    });

    return new NextResponse(null, {
        status: 204,
    });
}