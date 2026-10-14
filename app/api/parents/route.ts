import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, writeAudit } from "@/lib/api-auth";


export const runtime = "nodejs";

const READ_ROLES = [
    "SUPER_ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "RECEPTIONIST",
    "TEACHER",
] as const;

const WRITE_ROLES = [
    "SUPER_ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "RECEPTIONIST",
] as const;

export async function GET(request: Request) {
    try {
        const access = await authorize([...READ_ROLES]);

        if (!access.ok) {
            return access.response;
        }

        const { searchParams } = new URL(request.url);
        const search = (searchParams.get("search") || "").trim();

        const parents = await prisma.parent.findMany({
            where: search
                ? {
                    OR: [
                        { fatherName: { contains: search, mode: "insensitive" } },
                        { fatherPhone: { contains: search, mode: "insensitive" } },
                        { motherName: { contains: search, mode: "insensitive" } },
                        { motherPhone: { contains: search, mode: "insensitive" } },
                        { guardianName: { contains: search, mode: "insensitive" } },
                        { guardianPhone: { contains: search, mode: "insensitive" } },
                    ],
                }
                : undefined,
            include: {
                students: {
                    select: {
                        id: true,
                        admissionNumber: true,
                        firstName: true,
                        lastName: true,
                    },
                    orderBy: {
                        firstName: "asc",
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({
            items: parents,
            total: parents.length,
        });
    } catch (error) {
        console.error("GET /api/parents ERROR:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load parents.",
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const access = await authorize([...WRITE_ROLES]);

        if (!access.ok) {
            return access.response;
        }

        const body = await request.json();

        const parent = await prisma.$transaction(async (tx) => {
            const created = await tx.parent.create({
                data: {
                    fatherName: body.fatherName?.trim() || null,
                    fatherPhone: body.fatherPhone?.trim() || null,
                    fatherOccupation: body.fatherOccupation?.trim() || null,

                    motherName: body.motherName?.trim() || null,
                    motherPhone: body.motherPhone?.trim() || null,
                    motherOccupation: body.motherOccupation?.trim() || null,

                    guardianName: body.guardianName?.trim() || null,
                    guardianPhone: body.guardianPhone?.trim() || null,
                    guardianRelation: body.guardianRelation?.trim() || null,

                    address: body.address?.trim() || null,
                    emergencyContact: body.emergencyContact?.trim() || null,
                },
            });

            await writeAudit(
                tx,
                access.user.id,
                "create",
                "parents",
                created.id,
                "Parent record created.",
            );

            return created;
        });

        return NextResponse.json(parent, { status: 201 });
    } catch (error) {
        console.error("POST /api/parents ERROR:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to create parent.",
            },
            { status: 500 },
        );
    }
}