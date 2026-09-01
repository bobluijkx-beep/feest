import { prisma } from "@lions/core";
import { getPublicEvent } from "@/lib/get-event";
import { CartPageClient } from "./cart-page-client";

export default async function CartPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;

  // Voor de cross-sell-melding (alleen tickets in de winkelwagen → attenderen op
  // feestartikelen): heeft dit event überhaupt actieve feestartikelen om te tonen?
  // Geen notFound() hier — layout.tsx doet die check al voor de hele [eventSlug]-tak.
  const event = await getPublicEvent(eventSlug);
  const hasMerchandise = event
    ? (await prisma.product.count({ where: { eventId: event.id, kind: "MERCHANDISE", isActive: true } })) > 0
    : false;

  return <CartPageClient eventSlug={eventSlug} hasMerchandise={hasMerchandise} />;
}
