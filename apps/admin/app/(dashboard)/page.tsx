import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { getSelectedEvent } from "@/lib/selected-event";
import { EventTabs } from "@/lib/event-tabs";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", minWidth: 160 }}>
      <div style={{ fontSize: "0.85rem", color: "#555" }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

async function SalesDashboard({ organizationId, eventIdParam }: { organizationId: string; eventIdParam?: string }) {
  const { events, selected: event } = await getSelectedEvent(organizationId, eventIdParam);
  if (!event) {
    return <p>Nog geen event aangemaakt.</p>;
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
    <>
      <EventTabs events={events} selectedId={event.id} basePath="/" />
      <p>Event: {event.name}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <StatTile label="Verkochte tickets" value={String(soldTicketCount)} />
        <StatTile label="Omzet" value={`€${(revenueCents / 100).toFixed(2)}`} />
        <StatTile label="Resterende capaciteit" value={`${remainingCapacity} / ${totalCapacity}`} />
        <StatTile label="Conversie" value={conversionRate === null ? "—" : `${conversionRate}%`} />
        <StatTile label="Mislukte betalingen" value={String(failedCount)} />
        <StatTile label="Ingecheckt" value={String(checkedInCount)} />
      </div>
    </>
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
    return (
      <main>
        <h1>Verkoopdashboard</h1>
        <SalesDashboard organizationId={user.organizationId} eventIdParam={eventId} />
      </main>
    );
  }

  return (
    <main>
      <h1>Welkom</h1>
      <p>
        Ingelogd als {user.email} ({user.role}).
      </p>
    </main>
  );
}
