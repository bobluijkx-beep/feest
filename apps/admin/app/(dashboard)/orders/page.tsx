import Link from "next/link";
import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { EventFilter } from "./event-filter";
import { OrdersTable } from "./orders-table";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const { eventId } = await searchParams;

  const [orders, events, inactiveCount] = await Promise.all([
    prisma.order.findMany({
      where: { isVisible: true, ...(eventId ? { eventId } : {}) },
      orderBy: { createdAt: "desc" },
      include: { items: true, tickets: { include: { checkIns: true } }, event: true },
      take: 100,
    }),
    prisma.event.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { startsAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.order.count({ where: { isVisible: false } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <EventFilter events={events} selectedId={eventId} />
        <Link href="/orders/inactief" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Inactieve bestellingen bekijken{inactiveCount > 0 ? ` (${inactiveCount})` : ""}
        </Link>
      </div>
      <OrdersTable orders={orders} mode="active" canDelete={false} />
    </div>
  );
}
