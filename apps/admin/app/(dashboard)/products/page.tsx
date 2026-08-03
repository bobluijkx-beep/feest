import { prisma } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { ProductRowForm } from "./product-row-form";
import { CreateProductForm } from "./create-product-form";

export default async function ProductsPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const events = await prisma.event.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { startsAt: "desc" },
  });

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Nog geen event aangemaakt.</p>;
  }

  const eventNameById = new Map(events.map((event) => [event.id, event.name]));

  const products = await prisma.product.findMany({
    where: { eventId: { in: events.map((event) => event.id) } },
    orderBy: [{ eventId: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="flex flex-col gap-4">
      {products.map((product) => (
        <ProductRowForm
          key={product.id}
          product={{ ...product, eventName: eventNameById.get(product.eventId) ?? "?" }}
        />
      ))}
      {products.length === 0 && <p className="text-sm text-muted-foreground">Nog geen producten.</p>}

      <Card>
        <CardHeader>
          <CardTitle>Nieuw product</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateProductForm events={events.map((event) => ({ id: event.id, name: event.name }))} />
        </CardContent>
      </Card>
    </div>
  );
}
