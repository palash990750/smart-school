import { NextResponse } from "next/server";
import { auth } from "../../auth";

export type Role =
  | "SUPER_ADMIN"
  | "PRINCIPAL"
  | "VICE_PRINCIPAL"
  | "TEACHER"
  | "ACCOUNTANT"
  | "RECEPTIONIST"
  | "LIBRARIAN"
  | "TRANSPORT_MANAGER"
  | "DRIVER"
  | "STUDENT"
  | "PARENT"
  | "STAFF";

export type AuthorizedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
};

export async function authorize(
  allowedRoles?: Role[],
): Promise<
  | { ok: true; user: AuthorizedUser }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in is required." }, { status: 401 }),
    };
  }

  const user: AuthorizedUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "You do not have permission to do this." }, { status: 403 }),
    };
  }
  return { ok: true, user };
}

export async function requireAdministrator() {
  return authorize(["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"]);
}

export async function writeAudit(
  tx: { auditLog: { create: (args: { data: { actorId: string; action: string; module: string; recordId?: string; description: string } }) => Promise<unknown> } },
  userId: string,
  action: string,
  module: string,
  recordId: string | undefined,
  description: string,
) {
  await tx.auditLog.create({
    data: { actorId: userId, action, module, recordId, description },
  });
}