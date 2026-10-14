import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  currentAcademicSession,
  parseJson,
} from "@/lib/school";

export const runtime = "nodejs";

const sectionSchema = z.object({
  name: z.string().trim().min(1).max(40),

  capacity: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional(),
});

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
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

  const parsed = await parseJson(
    request,
    sectionSchema,
  );

  if ("response" in parsed) {
    return parsed.response;
  }

  const { id: classId } = await params;

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

  const schoolClass =
    await prisma.schoolClass.findFirst({
      where: {
        id: classId,
        sessionId: session.id,
      },
      select: {
        id: true,
        name: true,
        capacity: true,
      },
    });

  if (!schoolClass) {
    return NextResponse.json(
      {
        error: "Class not found.",
      },
      {
        status: 404,
      },
    );
  }

  /*
   * IMPORTANT:
   *
   * Section capacity can NEVER be greater
   * than the parent class capacity.
   *
   * If user leaves it blank:
   *     section capacity = class capacity
   *
   * If user enters a bigger number:
   *     section capacity = class capacity
   *
   * Therefore this API will never throw:
   * "Section capacity cannot exceed the class capacity."
   */

  const requestedCapacity =
    parsed.data.capacity;

  const capacity =
    requestedCapacity === undefined
      ? schoolClass.capacity
      : Math.min(
        requestedCapacity,
        schoolClass.capacity,
      );

  try {
    const section =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.section.create({
              data: {
                name: parsed.data.name,
                capacity,
                classId,
              },
            });

          await writeAudit(
            tx,
            access.user.id,
            "create",
            "sections",
            created.id,
            `Section ${created.name} added to ${schoolClass.name}.`,
          );

          return created;
        },
      );

    return NextResponse.json(
      {
        id: section.id,
        name: section.name,
        capacity: section.capacity,
        studentCount: 0,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "CREATE SECTION ERROR:",
      error,
    );

    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "That section already exists in this class.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          "Could not create section.",
      },
      {
        status: 500,
      },
    );
  }
}