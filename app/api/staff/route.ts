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

const staffSchema = z.object({
    employeeId: z.string().trim().min(1).max(40),
    name: z.string().trim().min(2).max(120),
    department: z.string().trim().min(2).max(100),
    designation: z.string().trim().min(2).max(100),

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
});

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

// GET: Staff list and search
export async function GET(request: Request) {
    const access = await authorize([...allowedRoles]);

    if (!access.ok) {
        return access.response;
    }

    const search = new URL(request.url).searchParams
        .get("search")
        ?.trim();

    const staff = await prisma.staff.findMany({
        where: search
            ? {
                OR: [
                    {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        employeeId: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        department: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        designation: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                ],
            }
            : undefined,
        orderBy: { name: "asc" },
        take: 500,
    });

    return NextResponse.json(staff.map(serializeStaff));
}

// POST: Create staff member
export async function POST(request: Request) {
    const access = await authorize([...managerRoles]);

    if (!access.ok) {
        return access.response;
    }

    const parsed = await parseJson(request, staffSchema);

    if ("response" in parsed) {
        return parsed.response;
    }

    try {
        const staff = await prisma.$transaction(async (tx) => {
            const created = await tx.staff.create({
                data: {
                    employeeId: parsed.data.employeeId,
                    name: parsed.data.name,
                    department: parsed.data.department,
                    designation: parsed.data.designation,
                    phone: parsed.data.phone ?? null,
                    address: parsed.data.address ?? null,
                    joiningDate: parsed.data.joiningDate
                        ? new Date(`${parsed.data.joiningDate}T00:00:00.000Z`)
                        : null,
                },
            });

            await writeAudit(
                tx,
                access.user.id,
                "create",
                "staff",
                created.id,
                "Staff record created.",
            );

            return created;
        });

        return NextResponse.json(serializeStaff(staff), {
            status: 201,
        });
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