import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, requireRole, AuthError } from "@lions/core";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { signOut } from "./actions/auth";

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);

  try {
    requireRole(user, ["ADMIN"]);
  } catch (err) {
    if (err instanceof AuthError) redirect(`/login?error=${encodeURIComponent(err.message)}`);
    throw err;
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Admin</h1>
      <p>Ingelogd als {user!.email} ({user!.role}).</p>
      <p>
        <Link href="/orders">Bestellingen bekijken</Link>
      </p>
      <form action={signOut}>
        <button type="submit">Uitloggen</button>
      </form>
    </main>
  );
}
