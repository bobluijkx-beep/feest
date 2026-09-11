import { prisma, getCartReminderText, DEFAULT_CART_REMINDER_TEXT } from "@lions/core";
import { getPublicEvent } from "@/lib/get-event";
import { CartPageClient } from "./cart-page-client";

export default async function CartPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;

  // Voor de cross-sell-melding (alleen tickets in de winkelwagen → attenderen op
  // feestartikelen): heeft dit event überhaupt actieve feestartikelen om te tonen?
  // Geen notFound() hier — layout.tsx doet die check al voor de hele [eventSlug]-tak.
  const event = await getPublicEvent(eventSlug);
  const [hasMerchandise, reminderText] = await Promise.all([
    event
      ? prisma.product.count({ where: { eventId: event.id, kind: "MERCHANDISE", isActive: true } }).then((n) => n > 0)
      : Promise.resolve(false),
    event ? getCartReminderText(event.organizationId) : Promise.resolve(DEFAULT_CART_REMINDER_TEXT),
  ]);

  return <CartPageClient eventSlug={eventSlug} hasMerchandise={hasMerchandise} reminderText={reminderText} />;
}
