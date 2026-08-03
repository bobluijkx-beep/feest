"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@lions/ui";
import { NAV_ITEMS } from "@/lib/nav-items";

function useSectionTitle() {
  const pathname = usePathname();
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));
  return match?.label ?? "Lionsclub Voorschoten";
}

export function AppHeader({
  email,
  role,
  onLogout,
}: {
  email: string;
  role: string;
  onLogout: () => Promise<void>;
}) {
  const title = useSectionTitle();

  return (
    <header className="flex h-16 flex-none items-center justify-between border-b bg-card px-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {email} ({role})
        </span>
        <form action={onLogout}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-4" />
            Uitloggen
          </Button>
        </form>
      </div>
    </header>
  );
}
