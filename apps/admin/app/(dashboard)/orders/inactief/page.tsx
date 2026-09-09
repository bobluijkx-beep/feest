import Link from "next/link";
import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { OrdersTable } from "../orders-table";

/** Afdeling "Inactief": bestellingen die met "Op inactief zetten" uit het standaardoverzicht
 * zijn gehaald. Alleen hiervandaan kan een order weer actief gemaakt worden, of — uitsluitend
 * ADMIN — definitief verwijderd worden (ook in bulk, zie OrdersTable/actions.ts). */
export default async function InactiveOrdersPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const [ordersRaw, optOuts] = await Promise.all([
    prisma.order.findMany({
      where: { isVisible: false },
      orderBy: { updatedAt: "desc" },
      include: { items: true, tickets: { include: { checkIns: true } }, event: true },
      take: 100,
    }),
    prisma.emailOptOut.findMany({ select: { email: true } }),
  ]);
  const optedOutEmails = new Set(optOuts.map((o) => o.email.toLowerCase()));
  const orders = ordersRaw.map((order) => ({ ...order, emailOptedOut: optedOutEmails.has(order.buyerEmail.toLowerCase()) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">Inactieve bestellingen</h1>
          <p className="text-sm text-muted-foreground">
            Verborgen uit het standaardoverzicht. Definitief verwijderen kan alleen hier.
          </p>
        </div>
        <Link href="/orders" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          ← Terug naar actieve bestellingen
        </Link>
      </div>
      <OrdersTable orders={orders} mode="inactive" canDelete={actor.role === "ADMIN"} />
    </div>
  );
}
