import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@lions/core";

/** Supabase-client gebonden aan de Next.js-cookiestore van de huidige request — voor
 * gebruik in Server Components/Actions/Route Handlers binnen apps/admin. */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerSupabaseClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options as never);
      });
    },
  });
}
