import Link from "next/link";
import { getCurrentUser } from "@lions/core";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { signOut } from "../actions/auth";

const NAV_BY_ROLE: Record<string, { href: string; label: string }[]> = {
  ADMIN: [
    { href: "/", label: "Dashboard" },
    { href: "/orders", label: "Bestellingen" },
    { href: "/events", label: "Evenementen" },
    { href: "/ticket-types", label: "Ticketsoorten" },
    { href: "/products", label: "Producten" },
    { href: "/settings", label: "Instellingen" },
    { href: "/content/emails", label: "E-mailtemplates" },
    { href: "/content/pages", label: "Paginabeheer" },
    { href: "/users", label: "Gebruikers" },
    { href: "/audit-log", label: "Audit-log" },
  ],
  FINANCE: [
    { href: "/", label: "Dashboard" },
    { href: "/orders", label: "Bestellingen" },
    { href: "/ticket-types", label: "Ticketsoorten" },
    { href: "/products", label: "Producten" },
    { href: "/settings", label: "Instellingen" },
  ],
  EDITOR: [
    { href: "/", label: "Dashboard" },
    { href: "/content/emails", label: "E-mailtemplates" },
    { href: "/content/pages", label: "Paginabeheer" },
  ],
  DOOR_STAFF: [],
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);
  const navItems = user ? (NAV_BY_ROLE[user.role] ?? []) : [];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #ddd",
          paddingBottom: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <nav style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span>
              {user.email} ({user.role})
            </span>
            <form action={signOut}>
              <button type="submit">Uitloggen</button>
            </form>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
