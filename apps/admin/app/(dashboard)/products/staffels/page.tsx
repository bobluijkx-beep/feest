import { prisma, describeTierGroup } from "@lions/core";
import { Card, CardContent, CardHeader, CardTitle } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { TierGroupForm, type EventOption } from "./tier-group-form";

export default async function TierGroupsPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const events = await prisma.event.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { startsAt: "desc" },
  });
  if (events.length === 0) return <p className="text-sm text-muted-foreground">Nog geen event aangemaakt.</p>;
  const eventIds = events.map((e) => e.id);

  const [groups, products] = await Promise.all([
    prisma.priceTierGroup.findMany({
      where: { eventId: { in: eventIds } },
      include: { tiers: true, products: { select: { id: true } } },
      orderBy: [{ eventId: "asc" }, { createdAt: "asc" }],
    }),
    prisma.product.findMany({
      where: { eventId: { in: eventIds }, isActive: true, kind: { in: ["TICKET", "MERCHANDISE"] } },
      include: { priceTierGroup: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const eventOptions: EventOption[] = events.map((event) => ({
    id: event.id,
    name: event.name,
    products: products
      .filter((p) => p.eventId === event.id)
      .map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, takenBy: p.priceTierGroup?.name ?? null })),
  }));
  const eventNameById = new Map(events.map((e) => [e.id, e.name]));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Een staffel geeft korting als iemand meer stuks koopt: &quot;elke 5e gratis&quot; of een lijst met aantallen en
        totaalprijzen. De stuks van alle producten in één staffel tellen samen — bijvoorbeeld 10 oliebollen met en 10
        zonder krenten krijgen samen de prijs van 20.
      </p>

      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle>
              {group.name} <span className="font-normal text-muted-foreground">— {eventNameById.get(group.eventId)}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {describeTierGroup({ ...group, tiers: group.tiers })}
            </p>
          </CardHeader>
          <CardContent>
            <TierGroupForm
              events={eventOptions.filter((e) => e.id === group.eventId)}
              group={{
                id: group.id,
                name: group.name,
                mode: group.mode,
                freeEvery: group.freeEvery,
                tiers: [...group.tiers].sort((a, b) => a.quantity - b.quantity),
                productIds: group.products.map((p) => p.id),
              }}
            />
          </CardContent>
        </Card>
      ))}
      {groups.length === 0 && <p className="text-sm text-muted-foreground">Nog geen staffels.</p>}

      <Card>
        <CardHeader>
          <CardTitle>Nieuwe staffel</CardTitle>
        </CardHeader>
        <CardContent>
          <TierGroupForm events={eventOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
