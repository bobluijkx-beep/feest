import {
  LayoutDashboard,
  Receipt,
  CalendarDays,
  Package,
  Settings,
  Mail,
  FileText,
  Users,
  History,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@lions/db";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "FINANCE", "EDITOR"] },
  { href: "/orders", label: "Bestellingen", icon: Receipt, roles: ["ADMIN", "FINANCE"] },
  { href: "/events", label: "Evenementen", icon: CalendarDays, roles: ["ADMIN"] },
  { href: "/products", label: "Producten", icon: Package, roles: ["ADMIN", "FINANCE"] },
  { href: "/settings", label: "Instellingen", icon: Settings, roles: ["ADMIN", "FINANCE"] },
  { href: "/content/emails", label: "E-mailtemplates", icon: Mail, roles: ["ADMIN", "EDITOR"] },
  { href: "/content/pages", label: "Paginabeheer", icon: FileText, roles: ["ADMIN", "EDITOR"] },
  { href: "/users", label: "Gebruikers", icon: Users, roles: ["ADMIN"] },
  { href: "/audit-log", label: "Audit-log", icon: History, roles: ["ADMIN"] },
];
