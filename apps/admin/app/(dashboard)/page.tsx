import { prisma, type AppUser } from "@lions/core";
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

async function SalesDashboard({ actor, eventIdParam }: { actor: AppUser; eventIdParam?: string }) {
  const { events, selected: event } = await getSelectedEvent(actor, eventIdParam);
  if (!event) {
    return <p className="text-sm text-muted-foreground">Nog geen event aangemaakt.</p>;
  }

  const [paidAgg, failedCount, ticketProducts, merchProducts, soldTicketCount, checkedInCount, merchAgg] =
    await Promise.all([
      prisma.order.aggregate({ where: { eventId: event.id, status: "PAID" }, _count: true, _sum: { totalCents: true } }),
      prisma.order.count({ where: { eventId: event.id, status: { in: ["FAILED", "CANCELLED", "EXPIRED"] } } }),
      prisma.product.findMany({ where: { eventId: event.id, kind: "TICKET" } }),
      prisma.product.findMany({ where: { eventId: event.id, kind: "MERCHANDISE" } }),
      prisma.ticket.count({ where: { order: { eventId: event.id }, status: { not: "CANCELLED" } } }),
      prisma.ticket.count({ where: { order: { eventId: event.id }, status: "CHECKED_IN" } }),
      prisma.orderItem.aggregate({
        where: { order: { eventId: event.id, status: "PAID" }, product: { kind: "MERCHANDISE" } },
        _sum: { quantity: true },
      }),
    ]);

  const revenueCents = paidAgg._sum.totalCents ?? 0;
  const paidOrderCount = paidAgg._count;
  const totalCapacity = ticketProducts.reduce((sum, t) => sum + t.totalStock, 0);
  const remainingCapacity = ticketProducts.reduce((sum, t) => sum + (t.totalStock - t.reservedStock - t.soldStock), 0);
  const conversionDenominator = paidOrderCount + failedCount;
  const conversionRate = conversionDenominator > 0 ? Math.round((paidOrderCount / conversionDenominator) * 100) : null;
  const soldProductCount = merchAgg._sum.quantity ?? 0;

  const hasTicketProducts = ticketProducts.length > 0;
  const hasMerchProducts = merchProducts.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <EventTabs events={events} selectedId={event.id} basePath="/" />
      <p className="text-sm text-muted-foreground">Event: {event.name}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {hasTicketProducts && <StatTile label="Verkochte tickets" value={String(soldTicketCount)} />}
        <StatTile label="Omzet" value={`€${(revenueCents / 100).toFixed(2)}`} />
        {hasTicketProducts && (
          <StatTile label="Resterende capaciteit" value={`${remainingCapacity} / ${totalCapacity}`} />
        )}
        <StatTile label="Conversie" value={conversionRate === null ? "—" : `${conversionRate}%`} />
        <StatTile label="Mislukte betalingen" value={String(failedCount)} />
        {hasTicketProducts && <StatTile label="Ingecheckt" value={String(checkedInCount)} />}
        {hasMerchProducts && <StatTile label="Verkochte producten" value={String(soldProductCount)} />}
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
    return <SalesDashboard actor={user} eventIdParam={eventId} />;
  }

  return (
    <p className="text-sm text-muted-foreground">
      Ingelogd als {user.email} ({user.role}).
    </p>
  );
}
