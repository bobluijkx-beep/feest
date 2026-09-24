import { notFound } from "next/navigation";
import { getActiveBundle } from "@lions/core";
import { Badge } from "@lions/ui";
import { getPublicEvent } from "@/lib/get-event";
import { AddToCartButton } from "../../[productId]/add-to-cart-button";

export default async function BundleDetailPage({
  params,
}: {
  params: Promise<{ eventSlug: string; bundleId: string }>;
}) {
  const { eventSlug, bundleId } = await params;
  const event = await getPublicEvent(eventSlug);
  if (!event) notFound();

  const bundle = await getActiveBundle(bundleId, event.id);
  if (!bundle) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:max-w-4xl lg:max-w-6xl">
      <div className="mx-auto max-w-xl">
        <div className="aspect-square w-full overflow-hidden rounded-2xl bg-muted">
          {bundle.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bundle.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Geen foto</div>
          )}
        </div>

        <h1 className="mt-6 font-display text-2xl">{bundle.name}</h1>
        {bundle.description && <p className="mt-2 text-sm text-muted-foreground">{bundle.description}</p>}
        <p className="mt-2 text-sm text-muted-foreground">
          Bevat: {bundle.components.map((c) => `${c.quantity}x ${c.productName}`).join(" + ")}
        </p>
        <p className="mt-2 text-lg font-medium">€{(bundle.priceCents / 100).toFixed(2)}</p>

        {bundle.availableUnits <= 0 ? (
          <Badge variant="secondary" className="mt-4">
            Uitverkocht
          </Badge>
        ) : (
          <AddToCartButton
            product={{
              // Synthetische sleutel (i.p.v. een echt Product.id) zodat de winkelwagen deze
              // regel niet per ongeluk samenvoegt met een los product — bundleId hieronder is
              // wat afrekenen/actions.ts's startCheckout gebruikt om 'm als combi te herkennen.
              productId: `bundle-${bundle.id}`,
              bundleId: bundle.id,
              name: bundle.name,
              priceCents: bundle.priceCents,
              imageUrl: bundle.imageUrl,
              // Een combi die al een feestartikel bevat hoeft de "vergeet je geen
              // feestartikel"-herinnering in de winkelwagen niet te krijgen (cart-page-
              // client.tsx's onlyTickets-check); een combi zonder feestartikel (bv. twee
              // ticketsoorten) moet 'm juist wél nog krijgen, vandaar kind="TICKET" in dat geval.
              kind: bundle.hasMerchandiseComponent ? "BUNDLE" : "TICKET",
            }}
            available={bundle.availableUnits}
            eventSlug={eventSlug}
          />
        )}
      </div>
    </main>
  );
}
