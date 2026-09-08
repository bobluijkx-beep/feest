import Link from "next/link";
import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { ProductsList } from "../products-list";

/** Afdeling "Inactief": producten die op inactief gezet zijn (los, of in bulk) uit het
 * standaardoverzicht. Alleen hiervandaan kan een product weer actief gemaakt worden, of
 * definitief verwijderd (als het nog nooit in een bestelling zat) — zelfde patroon als
 * bestellingen (orders/inactief). */
export default async function InactiveProductsPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const events = await prisma.event.findMany({
    where: { organizationId: actor.organizationId },
    select: { id: true, name: true },
  });
  const eventNameById = new Map(events.map((event) => [event.id, event.name]));

  const products = await prisma.product.findMany({
    where: { eventId: { in: events.map((event) => event.id) }, isActive: false },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">Inactieve producten</h1>
          <p className="text-sm text-muted-foreground">
            Verborgen uit het standaardoverzicht en niet meer te bestellen. Definitief verwijderen kan alleen hier.
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          ← Terug naar actieve producten
        </Link>
      </div>
      <ProductsList
        products={products.map((product) => ({ ...product, eventName: eventNameById.get(product.eventId) ?? "?" }))}
        mode="inactive"
      />
    </div>
  );
}
