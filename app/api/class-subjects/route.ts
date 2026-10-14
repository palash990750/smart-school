import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { currentAcademicSession } from "@/lib/school";

export const runtime = "nodejs";

const roles = [
    "SUPER_ADMIN",
    "PRINCIPAL",
    "VICE_PRINCIPAL",
    "TEACHER",
] as const;

/* =========================================================
   GET
   Class-wise subjects
   ========================================================= */

export async function GET(
    request: Request,
) {
    const access = await authorize([
        ...roles,
    ]);

    if (!access.ok) {
        return access.response;
    }

    try {
        const session =
            await currentAcademicSession();

        if (!session) {
            return NextResponse.json(
                {
                    error:
                        "No current academic session found.",
                },
                { status: 409 },
            );
        }

        const { searchParams } =
            new URL(request.url);

        const classId =
            searchParams.get("classId")?.trim() ||
            "";

        if (!classId) {
            return NextResponse.json(
                {
                    error:
                        "classId is required.",
                },
                { status: 400 },
            );
        }

        const schoolClass =
            await prisma.schoolClass.findFirst({
                where: {
                    id: classId,
                    sessionId: session.id,
                },
            });

        if (!schoolClass) {
            return NextResponse.json(
                {
                    error:
                        "Class not found in the current academic session.",
                },
                { status: 404 },
            );
        }

        const subjects =
            await prisma.classSubject.findMany({
                where: {
                    classId,
                    active: true,
                },
                orderBy: {
                    name: "asc",
                },
            });

        return NextResponse.json({
            items: subjects.map(
                (subject) => ({
                    id: subject.id,
                    classId: subject.classId,
                    name: subject.name,
                    code: subject.code,
                    defaultMaxMarks:
                        Number(
                            subject.defaultMaxMarks,
                        ),
                    defaultPassMarks:
                        Number(
                            subject.defaultPassMarks,
                        ),
                    active: subject.active,
                }),
            ),
        });
    } catch (error) {
        console.error(
            "GET class subjects error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    "Could not load class subjects.",
            },
            { status: 500 },
        );
    }
}

/* =========================================================
   POST
   Add subject to class
   ========================================================= */

export async function POST(
    request: Request,
) {
    const access = await authorize([
        "SUPER_ADMIN",
        "PRINCIPAL",
        "VICE_PRINCIPAL",
    ]);

    if (!access.ok) {
        return access.response;
    }

    try {
        const session =
            await currentAcademicSession();

        if (!session) {
            return NextResponse.json(
                {
                    error:
                        "No current academic session found.",
                },
                { status: 409 },
            );
        }

        const body =
            await request.json();

        const classId =
            typeof body?.classId === "string"
                ? body.classId.trim()
                : "";

        const name =
            typeof body?.name === "string"
                ? body.name.trim()
                : "";

        const code =
            typeof body?.code === "string"
                ? body.code.trim() || null
                : null;

        if (!classId || !name) {
            return NextResponse.json(
                {
                    error:
                        "Class and subject name are required.",
                },
                { status: 400 },
            );
        }

        const schoolClass =
            await prisma.schoolClass.findFirst({
                where: {
                    id: classId,
                    sessionId: session.id,
                },
            });

        if (!schoolClass) {
            return NextResponse.json(
                {
                    error:
                        "Class not found.",
                },
                { status: 404 },
            );
        }

        const existing =
            await prisma.classSubject.findFirst({
                where: {
                    classId,
                    name: {
                        equals: name,
                        mode: "insensitive",
                    },
                },
            });

        if (existing) {
            return NextResponse.json(
                {
                    error:
                        "This subject already exists for this class.",
                },
                { status: 409 },
            );
        }

        const subject =
            await prisma.classSubject.create({
                data: {
                    classId,
                    name,
                    code,
                    defaultMaxMarks: 100,
                    defaultPassMarks: 33,
                    active: true,
                },
            });

        return NextResponse.json(
            {
                ok: true,
                item: {
                    id: subject.id,
                    classId: subject.classId,
                    name: subject.name,
                    code: subject.code,
                    defaultMaxMarks:
                        Number(
                            subject.defaultMaxMarks,
                        ),
                    defaultPassMarks:
                        Number(
                            subject.defaultPassMarks,
                        ),
                    active: subject.active,
                },
                message:
                    "Subject added successfully.",
            },
            { status: 201 },
        );
    } catch (error) {
        console.error(
            "POST class subject error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    "Could not add subject.",
            },
            { status: 500 },
        );
    }
}