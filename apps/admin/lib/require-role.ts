import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, requireRole, AuthError, type AppUser } from "@lions/core";
import type { UserRole } from "@lions/db";
import { getSupabaseServerClient } from "./supabase-server";

/** Combineert getCurrentUser + requireRole + de juiste redirect voor Server
 * Components/Actions in apps/admin. De echte grens blijft requireRole() zelf — dit is
 * alleen het herbruikbare "haal op, check, en stuur anders door"-stukje. */
export async function requireStaffRole(allowed: UserRole[]): Promise<AppUser> {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);

  try {
    return requireRole(user, allowed);
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.status === 401) redirect(`/login?error=${encodeURIComponent(err.message)}`);
      redirect("/geen-toegang");
    }
    throw err;
  }
}
