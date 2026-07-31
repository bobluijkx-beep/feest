import { requireStaffRole } from "@/lib/require-role";

export default async function DashboardPage() {
  const user = await requireStaffRole(["ADMIN", "FINANCE", "EDITOR"]);

  return (
    <main>
      <h1>Welkom</h1>
      <p>
        Ingelogd als {user.email} ({user.role}).
      </p>
    </main>
  );
}
