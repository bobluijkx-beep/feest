import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { getSelectedEvent } from "@/lib/selected-event";
import { EventTabs } from "@/lib/event-tabs";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground">
      <p className="text-xs text-primary-foreground/80">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

async function SalesDashboard({ organizationId, eventIdParam }: { organizationId: string; eventIdParam?: string }) {
  const { events, selected: event } = await getSelectedEvent(organizationId, eventIdParam);
  if (!event) {
    return <p className="text-sm text-muted-foreground">Nog geen event aangemaakt.</p>;
  }

  const [paidAgg, failedCount, ticketProducts, soldTicketCount, checkedInCount] = await Promise.all([
    prisma.order.aggregate({ where: { eventId: event.id, status: "PAID" }, _count: true, _sum: { totalCents: true } }),
    prisma.order.count({ where: { eventId: event.id, status: { in: ["FAILED", "CANCELLED", "EXPIRED"] } } }),
    prisma.product.findMany({ where: { eventId: event.id, kind: "TICKET" } }),
    prisma.ticket.count({ where: { order: { eventId: event.id }, status: { not: "CANCELLED" } } }),
    prisma.ticket.count({ where: { order: { eventId: event.id }, status: "CHECKED_IN" } }),
  ]);

  const revenueCents = paidAgg._sum.totalCents ?? 0;
  const paidOrderCount = paidAgg._count;
  const totalCapacity = ticketProducts.reduce((sum, t) => sum + t.totalStock, 0);
  const remainingCapacity = ticketProducts.reduce((sum, t) => sum + (t.totalStock - t.reservedStock - t.soldStock), 0);
  const conversionDenominator = paidOrderCount + failedCount;
  const conversionRate = conversionDenominator > 0 ? Math.round((paidOrderCount / conversionDenominator) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      <EventTabs events={events} selectedId={event.id} basePath="/" />
      <p className="text-sm text-muted-foreground">Event: {event.name}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Verkochte tickets" value={String(soldTicketCount)} />
        <StatTile label="Omzet" value={`€${(revenueCents / 100).toFixed(2)}`} />
        <StatTile label="Resterende capaciteit" value={`${remainingCapacity} / ${totalCapacity}`} />
        <StatTile label="Conversie" value={conversionRate === null ? "—" : `${conversionRate}%`} />
        <StatTile label="Mislukte betalingen" value={String(failedCount)} />
        <StatTile label="Ingecheckt" value={String(checkedInCount)} />
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await requireStaffRole(["ADMIN", "FINANCE", "EDITOR"]);
  const { eventId } = await searchParams;

  if (user.role === "ADMIN" || user.role === "FINANCE") {
    return <SalesDashboard organizationId={user.organizationId} eventIdParam={eventId} />;
  }

  return (
    <p className="text-sm text-muted-foreground">
      Ingelogd als {user.email} ({user.role}).
    </p>
  );
}
