"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma, createAdminSupabaseClient } from "@lions/core";
import type { UserRole } from "@lions/db";
import { requireStaffRole } from "@/lib/require-role";

export interface CreateStaffUserState {
  error?: string;
  createdEmail?: string;
  tempPassword?: string;
}

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
  const validRoles: UserRole[] = ["ADMIN", "FINANCE", "EDITOR", "DOOR_STAFF"];

  if (!email || !validRoles.includes(role)) {
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

  await prisma.user.create({
    data: {
      organizationId: actor.organizationId,
      supabaseAuthId: data.user.id,
      email,
      role,
    },
  });

  revalidatePath("/users");
  return { createdEmail: email, tempPassword };
}

export async function updateStaffRole(formData: FormData): Promise<void> {
  await requireStaffRole(["ADMIN"]);

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  const validRoles: UserRole[] = ["ADMIN", "FINANCE", "EDITOR", "DOOR_STAFF"];
  if (!userId || !validRoles.includes(role)) return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/users");
}

export async function toggleStaffActive(formData: FormData): Promise<void> {
  await requireStaffRole(["ADMIN"]);

  const userId = String(formData.get("userId") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!userId) return;

  await prisma.user.update({ where: { id: userId }, data: { isActive: !isActive } });
  revalidatePath("/users");
}
