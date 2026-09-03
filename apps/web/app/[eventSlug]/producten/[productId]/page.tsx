import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { Badge } from "@lions/ui";
import { getPublicEvent } from "@/lib/get-event";
import { AddToCartButton } from "./add-to-cart-button";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ eventSlug: string; productId: string }>;
}) {
  const { eventSlug, productId } = await params;
  const event = await getPublicEvent(eventSlug);
  if (!event) notFound();

  const product = await prisma.product.findUnique({ where: { id: productId } });
  // Een donatieproduct heeft geen vaste prijs en dus geen zinvolle detailpagina met deze
  // sjabloon (AddToCartButton kent geen "ander bedrag"-veld) — die leeft alleen als
  // DonationModule op /producten zelf, nooit op deze route.
  if (!product || product.eventId !== event.id || !product.isActive || product.kind === "DONATION") notFound();

  const available = product.totalStock - product.reservedStock - product.soldStock;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:max-w-4xl lg:max-w-6xl">
      <div className="mx-auto max-w-xl">
        <div className="aspect-square w-full overflow-hidden rounded-2xl bg-muted">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Geen foto</div>
          )}
        </div>

        <h1 className="mt-6 font-display text-2xl">{product.name}</h1>
        {product.description && <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>}
        <p className="mt-2 text-lg font-medium">€{(product.priceCents / 100).toFixed(2)}</p>

        {available <= 0 ? (
          <Badge variant="secondary" className="mt-4">
            Uitverkocht
          </Badge>
        ) : (
          <AddToCartButton
            product={{
              productId: product.id,
              name: product.name,
              priceCents: product.priceCents,
              imageUrl: product.imageUrl,
              kind: product.kind,
            }}
            available={available}
          />
        )}
      </div>
    </main>
  );
}
