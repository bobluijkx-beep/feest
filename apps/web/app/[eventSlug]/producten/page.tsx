import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { getPublicEvent } from "@/lib/get-event";
import { ProductGrid } from "./product-grid";

export default async function ProductsPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const event = await getPublicEvent(eventSlug);
  if (!event) notFound();

  const products = await prisma.product.findMany({
    where: { eventId: event.id, isActive: true },
    orderBy: { priceCents: "asc" },
  });

  const ticketProducts = products.filter((p) => p.kind === "TICKET");
  const merchProducts = products.filter((p) => p.kind === "MERCHANDISE");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl">Producten</h1>

      {products.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">Er zijn momenteel geen artikelen beschikbaar.</p>
      )}

      {ticketProducts.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-heading text-base font-medium">Tickets</h2>
          <ProductGrid products={ticketProducts} eventSlug={eventSlug} />
        </div>
      )}

      {merchProducts.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-heading text-base font-medium">Producten</h2>
          <ProductGrid products={merchProducts} eventSlug={eventSlug} />
        </div>
      )}
    </main>
  );
}
