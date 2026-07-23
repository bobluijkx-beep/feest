import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "../db";
import type { User } from "@lions/db";

export type AppUser = User;

/** Haalt de ingelogde staff-gebruiker op: valideert eerst de sessie bij Supabase Auth
 * zelf (niet alleen het lokale cookie), koppelt dan aan de @lions/db User-rij. */
export async function getCurrentUser(supabase: SupabaseClient): Promise<AppUser | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const appUser = await prisma.user.findUnique({ where: { supabaseAuthId: authUser.id } });
  if (!appUser || !appUser.isActive) return null;

  return appUser;
}
