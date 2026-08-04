"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma, createAdminSupabaseClient, logAudit } from "@lions/core";
import type { UserRole } from "@lions/db";
import { requireStaffRole } from "@/lib/require-role";

export interface CreateStaffUserState {
  error?: string;
  createdEmail?: string;
  tempPassword?: string;
}

const VALID_ROLES: UserRole[] = ["ADMIN", "FINANCE", "EDITOR", "DOOR_STAFF"];
const EVENT_SCOPED_ROLES: UserRole[] = ["EDITOR", "DOOR_STAFF"];

function generateTempPassword(): string {
  return `Feest-${randomBytes(6).toString("base64url")}!`;
}

export async function createStaffUser(
  _prevState: CreateStaffUserState,
  formData: FormData,
): Promise<CreateStaffUserState> {
  const actor = await requireStaffRole(["ADMIN"]);

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;
  const eventIds = EVENT_SCOPED_ROLES.includes(role) ? formData.getAll("eventIds").map(String) : [];

  if (!email || !VALID_ROLES.includes(role)) {
    return { error: "Vul een geldig e-mailadres en rol in." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: `Er bestaat al een gebruiker met e-mailadres ${email}.` };
  }

  const tempPassword = generateTempPassword();
  const supabaseAdmin = createAdminSupabaseClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (error || !data.user) {
    return { error: `Aanmaken bij Supabase Auth mislukt: ${error?.message ?? "onbekende fout"}` };
  }

  const created = await prisma.user.create({
    data: {
      organizationId: actor.organizationId,
      supabaseAuthId: data.user.id,
      email,
      role,
      eventAccess: eventIds.length ? { create: eventIds.map((eventId) => ({ eventId })) } : undefined,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "user_created",
    entityType: "user",
    entityId: created.id,
    metadata: { email, role, eventIds },
  });

  revalidatePath("/users");
  return { createdEmail: email, tempPassword };
}

export async function updateStaffUser(formData: FormData): Promise<void> {
  const actor = await requireStaffRole(["ADMIN"]);

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!userId || !VALID_ROLES.includes(role)) return;

  const eventIds = EVENT_SCOPED_ROLES.includes(role) ? formData.getAll("eventIds").map(String) : [];

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role } }),
    prisma.eventAccess.deleteMany({ where: { userId } }),
    ...(eventIds.length
      ? [prisma.eventAccess.createMany({ data: eventIds.map((eventId) => ({ userId, eventId })) })]
      : []),
  ]);

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "user_role_changed",
    entityType: "user",
    entityId: userId,
    metadata: { role, eventIds },
  });
  revalidatePath("/users");
}

export async function toggleStaffActive(formData: FormData): Promise<void> {
  const actor = await requireStaffRole(["ADMIN"]);

  const userId = String(formData.get("userId") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!userId) return;

  await prisma.user.update({ where: { id: userId }, data: { isActive: !isActive } });
  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: isActive ? "user_deactivated" : "user_activated",
    entityType: "user",
    entityId: userId,
  });
  revalidatePath("/users");
}
