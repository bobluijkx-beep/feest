import Link from "next/link";
import { prisma } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { ProductsList } from "./products-list";
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
  const eventIds = events.map((event) => event.id);

  const [products, inactiveCount] = await Promise.all([
    prisma.product.findMany({
      where: { eventId: { in: eventIds }, isActive: true },
      orderBy: [{ eventId: "asc" }, { createdAt: "asc" }],
    }),
    prisma.product.count({ where: { eventId: { in: eventIds }, isActive: false } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-4">
        <Link href="/products/bundles" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Combi&apos;s beheren
        </Link>
        <Link
          href="/products/inactief"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Inactieve producten bekijken{inactiveCount > 0 ? ` (${inactiveCount})` : ""}
        </Link>
      </div>

      <ProductsList
        products={products.map((product) => ({ ...product, eventName: eventNameById.get(product.eventId) ?? "?" }))}
        mode="active"
      />

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
