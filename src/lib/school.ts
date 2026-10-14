import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/* =========================================================
   CURRENT ACADEMIC SESSION
   ========================================================= */

export async function currentAcademicSession() {
  return prisma.academicSession.findFirst({
    where: {
      isCurrent: true,
      status: "ACTIVE",
    },
    orderBy: {
      startDate: "desc",
    },
  });
}

/* =========================================================
   JSON VALIDATION
   ========================================================= */

export function jsonValidationError(
  error = "Check the submitted fields.",
) {
  return NextResponse.json(
    { error },
    { status: 400 },
  );
}

export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<
  { data: T } | { response: NextResponse }
> {
  const body = await request
    .json()
    .catch(() => null);

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      response: jsonValidationError(),
    };
  }

  return {
    data: parsed.data,
  };
}

/* =========================================================
   DATE / MONEY HELPERS
   ========================================================= */

export const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );

export const moneyNumber = (
  value:
    | { toNumber: () => number }
    | null
    | undefined,
) => value?.toNumber() ?? 0;

/* =========================================================
   STUDENT INPUT SCHEMA
   ========================================================= */

export const studentInputSchema = z.object({
  /* -------------------------------------------------------
     BASIC STUDENT INFORMATION
     ------------------------------------------------------- */

  admissionNumber: z
    .string()
    .trim()
    .min(1)
    .max(40),

  rollNumber: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable(),

  firstName: z
    .string()
    .trim()
    .min(1)
    .max(80),

  lastName: z
    .string()
    .trim()
    .min(1)
    .max(80),

  dateOfBirth: z
    .union([
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  gender: z
    .union([
      z.enum([
        "female",
        "male",
        "other",
      ]),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  email: z
    .union([
      z
        .string()
        .trim()
        .email()
        .max(254),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  phone: z
    .union([
      z
        .string()
        .trim()
        .max(40),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  /* -------------------------------------------------------
     CLASS / SECTION
     ------------------------------------------------------- */

  classId: z
    .string()
    .min(1),

  sectionId: z
    .string()
    .min(1),

  /* -------------------------------------------------------
     EXISTING PARENT / GUARDIAN FIELDS
     Kept for backward compatibility
     ------------------------------------------------------- */

  parentName: z
    .union([
      z
        .string()
        .trim()
        .max(160),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  parentPhone: z
    .union([
      z
        .string()
        .trim()
        .max(40),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  /* -------------------------------------------------------
     STUDENT PHOTO
     ------------------------------------------------------- */

  photoUrl: z
    .union([
      z
        .string()
        .trim()
        .max(500),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  /* -------------------------------------------------------
     FATHER INFORMATION
     ------------------------------------------------------- */

  fatherName: z
    .union([
      z
        .string()
        .trim()
        .max(160),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  fatherPhone: z
    .union([
      z
        .string()
        .trim()
        .max(40),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  fatherOccupation: z
    .union([
      z
        .string()
        .trim()
        .max(120),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  /* -------------------------------------------------------
     MOTHER INFORMATION
     ------------------------------------------------------- */

  motherName: z
    .union([
      z
        .string()
        .trim()
        .max(160),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  motherPhone: z
    .union([
      z
        .string()
        .trim()
        .max(40),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  motherOccupation: z
    .union([
      z
        .string()
        .trim()
        .max(120),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  /* -------------------------------------------------------
     OTHER PERSONAL INFORMATION
     ------------------------------------------------------- */

  bloodGroup: z
    .union([
      z
        .string()
        .trim()
        .max(10),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  address: z
    .union([
      z
        .string()
        .trim()
        .max(500),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  idNumber: z
    .union([
      z
        .string()
        .trim()
        .max(80),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  admissionDate: z
    .union([
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  previousSchool: z
    .union([
      z
        .string()
        .trim()
        .max(250),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  emergencyContact: z
    .union([
      z
        .string()
        .trim()
        .max(40),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  medicalNotes: z
    .union([
      z
        .string()
        .trim()
        .max(1000),
      z.literal(""),
    ])
    .nullable()
    .optional()
    .transform((value) =>
      value === "" ? null : value,
    ),

  /* -------------------------------------------------------
     FEES
     ------------------------------------------------------- */

  feeAmount: z.coerce
    .number()
    .finite()
    .min(0)
    .max(1_000_000_000)
    .default(0),
});

/* =========================================================
   STUDENT UPDATE SCHEMA
   ========================================================= */

export const studentUpdateSchema =
  studentInputSchema.partial();

/* =========================================================
   STUDENT PAYLOAD
   ========================================================= */

export function toStudentPayload(
  student: {
    id: string;

    admissionNumber: string;

    firstName: string;

    lastName: string;

    dateOfBirth: Date | null;

    gender: string | null;

    email: string | null;

    phone: string | null;

    status:
    | "ACTIVE"
    | "ARCHIVED";

    /* Existing fields */
    parentName: string | null;

    parentPhone: string | null;

    /* New student fields */
    photoUrl: string | null;

    fatherName: string | null;

    fatherPhone: string | null;

    fatherOccupation: string | null;

    motherName: string | null;

    motherPhone: string | null;

    motherOccupation: string | null;

    bloodGroup: string | null;

    address: string | null;

    idNumber: string | null;

    admissionDate: Date | null;

    previousSchool: string | null;

    emergencyContact: string | null;

    medicalNotes: string | null;

    createdAt: Date;

    enrollments: Array<{
      sessionId: string;

      classId: string;

      sectionId: string;

      rollNumber: string | null;

      class: {
        name: string;
      };

      section: {
        name: string;
      };
    }>;

    feeCharges: Array<{
      sessionId: string;

      amount: {
        toNumber: () => number;
      };
    }>;
  },

  sessionId: string,
) {
  const enrollment =
    student.enrollments.find(
      (entry) =>
        entry.sessionId === sessionId,
    );

  const fee =
    student.feeCharges.find(
      (entry) =>
        entry.sessionId === sessionId,
    );

  return {
    /* -----------------------------------------------------
       BASIC
       ----------------------------------------------------- */

    id: student.id,

    admissionNumber:
      student.admissionNumber,

    firstName:
      student.firstName,

    lastName:
      student.lastName,

    dateOfBirth:
      student.dateOfBirth
        ?.toISOString()
        .slice(0, 10) ?? null,

    gender:
      student.gender,

    email:
      student.email,

    phone:
      student.phone,

    status:
      student.status.toLowerCase() as
      | "active"
      | "archived",

    /* -----------------------------------------------------
       CLASS / SECTION
       ----------------------------------------------------- */

    classId:
      enrollment?.classId ?? "",

    className:
      enrollment?.class.name ?? "",

    sectionId:
      enrollment?.sectionId ?? "",

    sectionName:
      enrollment?.section.name ?? "",

    rollNumber:
      enrollment?.rollNumber ?? null,

    /* -----------------------------------------------------
       EXISTING PARENT
       ----------------------------------------------------- */

    parentName:
      student.parentName,

    parentPhone:
      student.parentPhone,

    /* -----------------------------------------------------
       NEW STUDENT DETAILS
       ----------------------------------------------------- */

    photoUrl:
      student.photoUrl,

    fatherName:
      student.fatherName,

    fatherPhone:
      student.fatherPhone,

    fatherOccupation:
      student.fatherOccupation,

    motherName:
      student.motherName,

    motherPhone:
      student.motherPhone,

    motherOccupation:
      student.motherOccupation,

    bloodGroup:
      student.bloodGroup,

    address:
      student.address,

    idNumber:
      student.idNumber,

    admissionDate:
      student.admissionDate
        ?.toISOString()
        .slice(0, 10) ?? null,

    previousSchool:
      student.previousSchool,

    emergencyContact:
      student.emergencyContact,

    medicalNotes:
      student.medicalNotes,

    /* -----------------------------------------------------
       FEE
       ----------------------------------------------------- */

    feeAmount:
      moneyNumber(fee?.amount),

    /* -----------------------------------------------------
       CREATED
       ----------------------------------------------------- */

    createdAt:
      student.createdAt.toISOString(),
  };
}

/* =========================================================
   STUDENT RELATION INCLUDE
   ========================================================= */
export const studentRelationInclude = (
  sessionId: string,
) =>
({
  enrollments: {
    where: {
      sessionId,
    },

    include: {
      class: {
        select: {
          name: true,
        },
      },

      section: {
        select: {
          name: true,
        },
      },
    },
  },

  feeCharges: {
    where: {
      sessionId,
    },

    select: {
      sessionId: true,
      amount: true,
    },
  },
} as const);