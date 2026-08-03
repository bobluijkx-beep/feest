import { getCurrentUser } from "@lions/core";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AppNav } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { signOut } from "../actions/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);

  if (!user) {
    return <div className="min-h-screen bg-background p-8">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-none flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
        <div className="px-3 pt-2">
          <p className="text-lg font-semibold tracking-tight">Lionsclub Voorschoten</p>
        </div>
        <AppNav role={user.role} />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader email={user.email} role={user.role} onLogout={signOut} />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
