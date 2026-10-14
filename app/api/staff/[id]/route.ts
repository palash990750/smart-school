import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/school";

export const runtime = "nodejs";

const managerRoles = [
    "SUPER_ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
] as const;

const allowedRoles = [
    ...managerRoles,
    "TEACHER",
] as const;

type RouteContext = {
    params: Promise<{ id: string }>;
};

const staffUpdateSchema = z
    .object({
        employeeId: z.string().trim().min(1).max(40).optional(),
        name: z.string().trim().min(2).max(120).optional(),
        department: z.string().trim().min(2).max(100).optional(),
        designation: z.string().trim().min(2).max(100).optional(),

        phone: z
            .union([z.string().trim().max(40), z.literal("")])
            .nullable()
            .optional()
            .transform((value) => value || null),

        address: z
            .union([z.string().trim().max(500), z.literal("")])
            .nullable()
            .optional()
            .transform((value) => value || null),

        joiningDate: z
            .union([
                z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
                z.literal(""),
            ])
            .nullable()
            .optional()
            .transform((value) => value || null),
    })
    .refine(
        (data) =>
            Object.values(data).some((value) => value !== undefined),
        {
            message: "Provide at least one field to update.",
        },
    );

function serializeStaff(staff: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    designation: string;
    phone: string | null;
    address: string | null;
    joiningDate: Date | null;
    createdAt: Date;
}) {
    return {
        ...staff,
        joiningDate: staff.joiningDate
            ? staff.joiningDate.toISOString().slice(0, 10)
            : null,
        createdAt: staff.createdAt.toISOString(),
    };
}

// GET: Fetch one staff record
export async function GET(
    _request: Request,
    context: RouteContext,
) {
    const access = await authorize([...allowedRoles]);

    if (!access.ok) {
        return access.response;
    }

    const { id } = await context.params;

    const staff = await prisma.staff.findUnique({
        where: { id },
    });

    if (!staff) {
        return NextResponse.json(
            { error: "Staff record not found." },
            { status: 404 },
        );
    }

    return NextResponse.json(serializeStaff(staff));
}

// PATCH: Update staff record
export async function PATCH(
    request: Request,
    context: RouteContext,
) {
    const access = await authorize([...managerRoles]);

    if (!access.ok) {
        return access.response;
    }

    const { id } = await context.params;

    const parsed = await parseJson(request, staffUpdateSchema);

    if ("response" in parsed) {
        return parsed.response;
    }

    try {
        const staff = await prisma.$transaction(async (tx) => {
            const existing = await tx.staff.findUnique({
                where: { id },
            });

            if (!existing) {
                return null;
            }

            const data = parsed.data;

            const updated = await tx.staff.update({
                where: { id },
                data: {
                    ...(data.employeeId !== undefined && {
                        employeeId: data.employeeId,
                    }),
                    ...(data.name !== undefined && {
                        name: data.name,
                    }),
                    ...(data.department !== undefined && {
                        department: data.department,
                    }),
                    ...(data.designation !== undefined && {
                        designation: data.designation,
                    }),
                    ...(data.phone !== undefined && {
                        phone: data.phone,
                    }),
                    ...(data.address !== undefined && {
                        address: data.address,
                    }),
                    ...(data.joiningDate !== undefined && {
                        joiningDate: data.joiningDate
                            ? new Date(`${data.joiningDate}T00:00:00.000Z`)
                            : null,
                    }),
                },
            });

            await writeAudit(
                tx,
                access.user.id,
                "update",
                "staff",
                updated.id,
                "Staff record updated.",
            );

            return updated;
        });

        if (!staff) {
            return NextResponse.json(
                { error: "Staff record not found." },
                { status: 404 },
            );
        }

        return NextResponse.json(serializeStaff(staff));
    } catch (error) {
        if (
            error instanceof Error &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "That employee ID is already in use." },
                { status: 409 },
            );
        }

        throw error;
    }
}

// DELETE: Delete staff record
export async function DELETE(
    _request: Request,
    context: RouteContext,
) {
    const access = await authorize([...managerRoles]);

    if (!access.ok) {
        return access.response;
    }

    const { id } = await context.params;

    try {
        const deleted = await prisma.$transaction(async (tx) => {
            const existing = await tx.staff.findUnique({
                where: { id },
            });

            if (!existing) {
                return false;
            }

            await tx.staff.delete({
                where: { id },
            });

            await writeAudit(
                tx,
                access.user.id,
                "delete",
                "staff",
                existing.id,
                "Staff record deleted.",
            );

            return true;
        });

        if (!deleted) {
            return NextResponse.json(
                { error: "Staff record not found." },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            message: "Staff record deleted successfully.",
        });
    } catch (error) {
        if (
            error instanceof Error &&
            "code" in error &&
            error.code === "P2003"
        ) {
            return NextResponse.json(
                {
                    error:
                        "This staff record is referenced by other records and cannot be deleted.",
                },
                { status: 409 },
            );
        }

        throw error;
    }
}