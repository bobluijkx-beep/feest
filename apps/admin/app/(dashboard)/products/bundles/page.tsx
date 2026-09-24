import { prisma } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { CreateBundleForm } from "./create-bundle-form";
import { BundleRowForm } from "./bundle-row-form";

export default async function BundlesPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const events = await prisma.event.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { startsAt: "desc" },
  });

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Nog geen event aangemaakt.</p>;
  }

  const eventIds = events.map((event) => event.id);

  const [bundles, products] = await Promise.all([
    prisma.productBundle.findMany({
      where: { eventId: { in: eventIds } },
      include: { items: { select: { productId: true, quantity: true } } },
      orderBy: [{ eventId: "asc" }, { createdAt: "asc" }],
    }),
    // TICKET/MERCHANDISE (geen DONATION, zie component-picker.tsx) — inclusief inmiddels
    // inactieve producten die nog wél in een bestaande combi zitten, anders zou het
    // bewerkformulier die stilletjes uit de selectie laten vallen.
    prisma.product.findMany({
      where: { eventId: { in: eventIds }, kind: { in: ["TICKET", "MERCHANDISE"] } },
      orderBy: { name: "asc" },
    }),
  ]);

  const eventNameById = new Map(events.map((event) => [event.id, event.name]));
  const activeProductsByEvent = new Map<string, { id: string; name: string; kind: string }[]>();
  for (const product of products) {
    if (!product.isActive) continue;
    const list = activeProductsByEvent.get(product.eventId) ?? [];
    list.push({ id: product.id, name: product.name, kind: product.kind });
    activeProductsByEvent.set(product.eventId, list);
  }
  const productById = new Map(products.map((p) => [p.id, { id: p.id, name: p.name, kind: p.kind }]));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Een combi (bv. Ticket + Glowstick) is één koopbaar artikel tegen één prijs — bij aankoop valt hij vanzelf
        uiteen in de onderliggende producten, zodat voorraad en dashboardcijfers daarvan gewoon blijven kloppen.
      </p>

      <div className="flex flex-col gap-3">
        {bundles.map((bundle) => {
          // Voor de picker in het bewerkformulier: actieve producten van dit event, aangevuld
          // met de (mogelijk inmiddels inactieve) producten die al in déze combi zitten.
          const available = new Map(
            (activeProductsByEvent.get(bundle.eventId) ?? []).map((p) => [p.id, p]),
          );
          for (const item of bundle.items) {
            const product = productById.get(item.productId);
            if (product) available.set(product.id, product);
          }

          return (
            <BundleRowForm
              key={bundle.id}
              bundle={{ ...bundle, eventName: eventNameById.get(bundle.eventId) ?? "?" }}
              availableProducts={[...available.values()]}
            />
          );
        })}
        {bundles.length === 0 && <p className="text-sm text-muted-foreground">Nog geen combi&apos;s.</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nieuwe combi</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateBundleForm
            events={events.map((event) => ({
              id: event.id,
              name: event.name,
              products: activeProductsByEvent.get(event.id) ?? [],
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
