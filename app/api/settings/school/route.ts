import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, writeAudit } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { currentAcademicSession, parseJson } from "@/lib/school";

export const runtime = "nodejs";

const imageDataUrlSchema = z
  .union([
    z
      .string()
      .refine(
        (value) =>
          /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(
            value,
          ),
        {
          message:
            "Only PNG, JPG, JPEG or WEBP images are allowed.",
        },
      )
      .refine(
        (value) => value.length <= 3_000_000,
        {
          message:
            "Image is too large. Maximum allowed size is approximately 2 MB.",
        },
      ),
    z.null(),
  ])
  .optional();

const settingsSchema = z.object({
  schoolName: z.string().trim().min(2).max(120),
  schoolCode: z.string().trim().min(1).max(40),
  address: z.string().trim().max(500),
  city: z.string().trim().max(100),
  state: z.string().trim().max(100),
  country: z.string().trim().max(100),
  phone: z.string().trim().max(40),
  email: z.string().trim().email().max(254),

  logoUrl: imageDataUrlSchema,
  headSignatureUrl: imageDataUrlSchema,
});

const administratorRoles = [
  "SUPER_ADMIN",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
] as const;

function responseData(
  settings: {
    schoolName: string;
    schoolCode: string;
    address: string;
    city: string;
    state: string;
    country: string;
    phone: string;
    email: string;
    logoUrl: string | null;
    headSignatureUrl: string | null;
  },
  session: { name: string } | null,
) {
  return {
    schoolName: settings.schoolName,
    schoolCode: settings.schoolCode,
    address: settings.address,
    city: settings.city,
    state: settings.state,
    country: settings.country,
    phone: settings.phone,
    email: settings.email,
    logoUrl: settings.logoUrl ?? null,
    headSignatureUrl:
      settings.headSignatureUrl ?? null,
    currentSession: session?.name ?? null,
  };
}

export async function GET() {
  const access = await authorize();

  if (!access.ok) {
    return access.response;
  }

  const [settings, session] = await Promise.all([
    prisma.schoolSettings.findUnique({
      where: {
        id: "school",
      },
    }),
    currentAcademicSession(),
  ]);

  if (!settings) {
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

  return NextResponse.json(
    responseData(settings, session),
  );
}

export async function PUT(request: Request) {
  const access = await authorize([
    ...administratorRoles,
  ]);

  if (!access.ok) {
    return access.response;
  }

  const parsed = await parseJson(
    request,
    settingsSchema,
  );

  if ("response" in parsed) {
    return parsed.response;
  }

  const settings =
    await prisma.$transaction(async (tx) => {
      const existing =
        await tx.schoolSettings.findUnique({
          where: {
            id: "school",
          },
        });

      const data = {
        schoolName:
          parsed.data.schoolName,
        schoolCode:
          parsed.data.schoolCode,
        address:
          parsed.data.address,
        city:
          parsed.data.city,
        state:
          parsed.data.state,
        country:
          parsed.data.country,
        phone:
          parsed.data.phone,
        email:
          parsed.data.email,
      };

      const mediaData: {
        logoUrl?: string | null;
        headSignatureUrl?: string | null;
      } = {};

      if (
        parsed.data.logoUrl !==
        undefined
      ) {
        mediaData.logoUrl =
          parsed.data.logoUrl;
      }

      if (
        parsed.data
          .headSignatureUrl !==
        undefined
      ) {
        mediaData.headSignatureUrl =
          parsed.data.headSignatureUrl;
      }

      const updated =
        await tx.schoolSettings.upsert({
          where: {
            id: "school",
          },

          create: {
            id: "school",
            ...data,
            logoUrl:
              mediaData.logoUrl ??
              null,
            headSignatureUrl:
              mediaData.headSignatureUrl ??
              null,
          },

          update: {
            ...data,
            ...mediaData,
          },
        });

      await writeAudit(
        tx,
        access.user.id,
        "edit",
        "settings",
        updated.id,
        existing
          ? "School profile updated."
          : "School profile created.",
      );

      return updated;
    });

  const session =
    await currentAcademicSession();

  return NextResponse.json(
    responseData(settings, session),
  );
}