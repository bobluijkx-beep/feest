import { createServerClient } from "@supabase/ssr";
import type { CookieAdapter } from "./cookies";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Ontbrekende environment variable: ${name}`);
  return value;
}

/** RLS-scoped Supabase-client voor Server Components/Actions — gebruikt de sessie van de ingelogde staff-gebruiker. */
export function createServerSupabaseClient(cookies: CookieAdapter) {
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookies.getAll(),
        setAll: (cookiesToSet: Parameters<CookieAdapter["setAll"]>[0]) => cookies.setAll(cookiesToSet),
      },
    },
  );
}
