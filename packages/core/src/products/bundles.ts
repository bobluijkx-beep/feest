import "server-only";
import { prisma } from "../db";

export interface BundleComponent {
  productId: string;
  productName: string;
  productKind: string;
  quantity: number;
}

export interface StorefrontBundle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  components: BundleComponent[];
  /** Hoeveel eenheden van de combi nog verkocht kunnen worden — het minimum, over alle
   * componenten, van floor(beschikbare voorraad van dat product / aantal per combi). Een
   * combi heeft bewust geen eigen voorraadteller (zie schema.prisma), dus dit wordt altijd
   * live afgeleid van de onderliggende Producten. */
  availableUnits: number;
  /** Stuurt de "vergeet je geen feestartikel"-herinnering in de winkelwagen (winkelwagen/
   * cart-page-client.tsx): een combi die al een MERCHANDISE-component bevat hoeft die
   * melding niet te krijgen, een pure ticket-combi (bv. 2 ticketsoorten) wel. */
  hasMerchandiseComponent: boolean;
}

function toStorefrontBundle(bundle: {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  items: { quantity: number; product: { id: string; name: string; kind: string; totalStock: number; reservedStock: number; soldStock: number } }[];
}): StorefrontBundle {
  const components = bundle.items.map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    productKind: item.product.kind,
    quantity: item.quantity,
  }));

  const availableUnits = bundle.items.reduce((min, item) => {
    const available = item.product.totalStock - item.product.reservedStock - item.product.soldStock;
    const unitsFromThisComponent = Math.max(Math.floor(available / item.quantity), 0);
    return Math.min(min, unitsFromThisComponent);
  }, Infinity);

  return {
    id: bundle.id,
    name: bundle.name,
    description: bundle.description,
    imageUrl: bundle.imageUrl,
    priceCents: bundle.priceCents,
    currency: bundle.currency,
    components,
    availableUnits: Number.isFinite(availableUnits) ? availableUnits : 0,
    hasMerchandiseComponent: components.some((c) => c.productKind === "MERCHANDISE"),
  };
}

/** Actieve combi's van een event, met live afgeleide beschikbaarheid — gebruikt door de
 * publieke productenpagina (apps/web). */
export async function listActiveBundlesForEvent(eventId: string): Promise<StorefrontBundle[]> {
  const bundles = await prisma.productBundle.findMany({
    where: { eventId, isActive: true },
    include: { items: { include: { product: true } } },
    orderBy: { priceCents: "asc" },
  });
  return bundles.map(toStorefrontBundle);
}

export async function getActiveBundle(bundleId: string, eventId: string): Promise<StorefrontBundle | null> {
  const bundle = await prisma.productBundle.findUnique({
    where: { id: bundleId },
    include: { items: { include: { product: true } } },
  });
  if (!bundle || bundle.eventId !== eventId || !bundle.isActive) return null;
  return toStorefrontBundle(bundle);
}

/** Verdeelt de combi-prijs (in centen, voor één combi-eenheid) over de componenten, evenredig
 * naar elk component's eigen (standalone) prijs × aantal — zodat "omzet per product" op het
 * dashboard eerlijk verdeeld blijft in plaats van alles op één component te boeken. Largest-
 * remainder-afronding garandeert dat de som van het resultaat altijd exact `bundlePriceCents`
 * is (nooit een paar cent kwijtraken/toevoegen door afronding). Bij componenten die allemaal
 * €0 wegen (zou niet moeten voorkomen, priceCents is altijd >0) valt terug op een gelijke
 * verdeling. */
export function splitBundlePriceCents(
  bundlePriceCents: number,
  components: { productId: string; weightCents: number }[],
): Map<string, number> {
  const totalWeight = components.reduce((sum, c) => sum + c.weightCents, 0);

  if (totalWeight <= 0) {
    const equalShare = Math.floor(bundlePriceCents / components.length);
    const result = new Map(components.map((c) => [c.productId, equalShare]));
    const remainder = bundlePriceCents - equalShare * components.length;
    if (remainder > 0) result.set(components[0].productId, equalShare + remainder);
    return result;
  }

  const floored = components.map((c) => {
    const exact = (bundlePriceCents * c.weightCents) / totalWeight;
    return { productId: c.productId, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  const allocated = floored.reduce((sum, f) => sum + f.cents, 0);
  const remaining = bundlePriceCents - allocated;

  const result = new Map(floored.map((f) => [f.productId, f.cents]));
  const byRemainderDesc = [...floored].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining; i++) {
    const productId = byRemainderDesc[i % byRemainderDesc.length].productId;
    result.set(productId, (result.get(productId) ?? 0) + 1);
  }
  return result;
}
