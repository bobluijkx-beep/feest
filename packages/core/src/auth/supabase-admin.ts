import "server-only";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Ontbrekende environment variable: ${name}`);
  return value;
}

/** Service-role Supabase-client. Alleen server-only en alleen voor smalle,
 * bewust gekozen taken (bv. auth.admin.* gebruikersbeheer) — nooit voor gewone
 * dataqueries, die lopen via Prisma (@lions/db). */
export function createAdminSupabaseClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
