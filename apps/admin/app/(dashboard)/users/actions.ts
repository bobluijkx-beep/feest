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
  // Nooit het eigen account deactiveren — dezelfde bescherming als bulkSetUsersActive,
  // anders sluit je jezelf per ongeluk buiten (deze knop staat sowieso al disabled in de
  // UI voor je eigen rij, maar dit is de echte serverside-grens).
  if (isActive && userId === actor.id) return;

  await prisma.user.update({ where: { id: userId }, data: { isActive: !isActive } });
  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: isActive ? "user_deactivated" : "user_activated",
    entityType: "user",
    entityId: userId,
  });
  revalidatePath("/users");
  revalidatePath("/users/inactief");
}

export interface BulkActionResult {
  error?: string;
}

/** Bulk-variant van toggleStaffActive — rechtstreeks aangeroepen vanuit de
 * selectievakjes-werkbalk (zie apps/admin/lib/use-bulk-selection.ts) met een array van
 * id's i.p.v. FormData. Nooit het eigen account deactiveren, anders sluit je jezelf
 * per ongeluk buiten. */
export async function bulkSetUsersActive(userIds: string[], isActive: boolean): Promise<BulkActionResult> {
  const actor = await requireStaffRole(["ADMIN"]);
  if (userIds.length === 0) return {};
  if (!isActive && userIds.includes(actor.id)) {
    return { error: "Je kunt je eigen account niet deactiveren." };
  }

  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { isActive } });

  for (const user of users) {
    await logAudit({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: isActive ? "user_activated" : "user_deactivated",
      entityType: "user",
      entityId: user.id,
      metadata: { email: user.email, bulk: true },
    });
  }

  revalidatePath("/users");
  revalidatePath("/users/inactief");
  return {};
}

/** Permanent verwijderen kan uitsluitend gedeactiveerde gebruikers treffen (zelfde patroon
 * als bestellingen/producten) en nooit het eigen account. Ruimt naast de eigen rij ook de
 * Supabase Auth-gebruiker op — getCurrentUser (session.ts) wijst een sessie zonder
 * passende @lions/db-rij sowieso al af, maar zonder dit zou er een weeskoppeling met een
 * los, nog inlogbaar Auth-account blijven bestaan. EventAccess staat op ON DELETE
 * RESTRICT en moet daarom eerst expliciet weg. Gebruikt zowel door de losse
 * "Verwijderen"-knop per rij (met één id) als de bulkactie in de werkbalk. */
export async function bulkDeleteUsers(userIds: string[]): Promise<BulkActionResult> {
  const actor = await requireStaffRole(["ADMIN"]);
  if (userIds.length === 0) return {};

  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const supabaseAdmin = createAdminSupabaseClient();
  const errors: string[] = [];

  for (const user of users) {
    if (user.id === actor.id) {
      errors.push(`${user.email}: kan het eigen account niet verwijderen.`);
      continue;
    }
    if (user.isActive) {
      errors.push(`${user.email}: alleen gedeactiveerde gebruikers kunnen verwijderd worden.`);
      continue;
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.supabaseAuthId);
    if (authError) console.error("Kon Supabase Auth-gebruiker niet verwijderen", user.id, authError);

    await prisma.$transaction([
      prisma.eventAccess.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    await logAudit({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: "user_deleted",
      entityType: "user",
      entityId: user.id,
      metadata: { email: user.email, bulk: true },
    });
  }

  revalidatePath("/users");
  revalidatePath("/users/inactief");
  return errors.length > 0 ? { error: errors.slice(0, 3).join(" ") } : {};
}
