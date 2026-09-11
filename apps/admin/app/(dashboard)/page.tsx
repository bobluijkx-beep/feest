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

  // isVisible: true op elke order-gebaseerde query: "op inactief zetten" (Order.isVisible)
  // verbergt een bestelling uit deze cijfers, ook al blijft de onderliggende voorraad
  // (Product.reservedStock/soldStock, en dus Resterende capaciteit hieronder) bewust
  // ongemoeid — dat is een apart, expliciet besloten gedrag (zie setOrderVisibility,
  // packages/core/checkout/set-order-visibility.ts): inactief is puur zichtbaarheid, geen
  // annulering. Zet je dus alle bestellingen van een event op inactief zonder ze te
  // verwijderen, dan vallen deze tegels terug naar nul/leeg — de capaciteitstegel niet,
  // want die weerspiegelt voorraad, niet zichtbaarheid.
  const [paidAgg, failedCount, ticketProducts, merchProducts, donationProducts, soldTicketCount, checkedInCount, extraOrderItems] =
    await Promise.all([
      prisma.order.aggregate({
        where: { eventId: event.id, status: "PAID", isVisible: true },
        _count: true,
        _sum: { totalCents: true },
      }),
      prisma.order.count({
        where: { eventId: event.id, status: { in: ["FAILED", "CANCELLED", "EXPIRED"] }, isVisible: true },
      }),
      prisma.product.findMany({ where: { eventId: event.id, kind: "TICKET" } }),
      prisma.product.findMany({ where: { eventId: event.id, kind: "MERCHANDISE" } }),
      prisma.product.findMany({ where: { eventId: event.id, kind: "DONATION" } }),
      prisma.ticket.count({
        where: { order: { eventId: event.id, isVisible: true }, status: { not: "CANCELLED" } },
      }),
      prisma.ticket.count({ where: { order: { eventId: event.id, isVisible: true }, status: "CHECKED_IN" } }),
      // Aantal en omzet apart voor feestartikelen/donaties: geen kant-en-klare aggregate
      // hiervoor (omzet per regel = quantity * unitPriceCents, dat kan Prisma's aggregate()
      // niet berekenen), dus zelf optellen over de losse regels.
      prisma.orderItem.findMany({
        where: {
          order: { eventId: event.id, status: "PAID", isVisible: true },
          product: { kind: { in: ["MERCHANDISE", "DONATION"] } },
        },
        select: { quantity: true, unitPriceCents: true, product: { select: { kind: true } } },
      }),
    ]);

  const revenueCents = paidAgg._sum.totalCents ?? 0;
  const paidOrderCount = paidAgg._count;
  const totalCapacity = ticketProducts.reduce((sum, t) => sum + t.totalStock, 0);
  const remainingCapacity = ticketProducts.reduce((sum, t) => sum + (t.totalStock - t.reservedStock - t.soldStock), 0);
  const conversionDenominator = paidOrderCount + failedCount;
  const conversionRate = conversionDenominator > 0 ? Math.round((paidOrderCount / conversionDenominator) * 100) : null;

  let merchCount = 0;
  let merchRevenueCents = 0;
  let donationCount = 0;
  let donationRevenueCents = 0;
  for (const item of extraOrderItems) {
    const lineCents = item.quantity * item.unitPriceCents;
    if (item.product.kind === "MERCHANDISE") {
      merchCount += item.quantity;
      merchRevenueCents += lineCents;
    } else {
      donationCount += item.quantity;
      donationRevenueCents += lineCents;
    }
  }

  const hasTicketProducts = ticketProducts.length > 0;
  const hasMerchProducts = merchProducts.length > 0;
  const hasDonationProducts = donationProducts.length > 0;

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
        {hasMerchProducts && <StatTile label="Verkochte feestartikelen" value={String(merchCount)} />}
        {hasMerchProducts && (
          <StatTile label="Omzet feestartikelen" value={`€${(merchRevenueCents / 100).toFixed(2)}`} />
        )}
        {hasDonationProducts && <StatTile label="Aantal donaties" value={String(donationCount)} />}
        {hasDonationProducts && (
          <StatTile label="Omzet donaties" value={`€${(donationRevenueCents / 100).toFixed(2)}`} />
        )}
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
