import "server-only";
import type { ProductKind } from "@lions/db";
import { prisma } from "../db";
import { eventBrandingVars } from "./event-branding";
import { getCustomPlaceholderVars } from "./custom-placeholders";
import { buildUnsubscribeLinkHtml } from "./unsubscribe";

export interface CampaignSegment {
  eventId: string;
  /** Leeg/undefined = alle producttypes. */
  productKinds?: ProductKind[];
  /** Alleen zinvol voor events met TICKET-producten. */
  checkedInFilter?: "ANY" | "NOT_CHECKED_IN" | "CHECKED_IN";
}

export interface SegmentRecipient {
  email: string;
  personalization: Record<string, string>;
}

/** Bouwt de deelnemerslijst voor een segment. Filtert in JS i.p.v. geneste Prisma-where's
 * — zelfde stijl als de bestaande dashboard-aggregaties. Sluit e-mailadressen in
 * EmailOptOut altijd uit, zodat het preview-aantal in de admin al correct is. Toekomstige
 * segment-dimensies (bv. team) breiden CampaignSegment en deze functie uit zonder de
 * call-sites te raken. */
export async function buildSegmentRecipients(segment: CampaignSegment): Promise<SegmentRecipient[]> {
  const [orders, optOuts, event] = await Promise.all([
    prisma.order.findMany({
      where: { eventId: segment.eventId, status: "PAID" },
      include: { items: { include: { product: true } }, tickets: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.emailOptOut.findMany({ select: { email: true } }),
    prisma.event.findUniqueOrThrow({
      where: { id: segment.eventId },
      select: { name: true, theme: true, organizationId: true },
    }),
  ]);

  const [brandingVars, customVars] = await Promise.all([
    eventBrandingVars(event.theme),
    getCustomPlaceholderVars(event.organizationId),
  ]);
  const optedOut = new Set(optOuts.map((o) => o.email.toLowerCase()));
  const byEmail = new Map<string, SegmentRecipient>();

  for (const order of orders) {
    if (optedOut.has(order.buyerEmail.toLowerCase())) continue;

    if (segment.productKinds && segment.productKinds.length > 0) {
      const kinds = segment.productKinds;
      const matchesKind = order.items.some((item) => kinds.includes(item.product.kind));
      if (!matchesKind) continue;
    }

    if (segment.checkedInFilter === "NOT_CHECKED_IN") {
      if (!order.tickets.some((t) => t.status === "UNUSED")) continue;
    } else if (segment.checkedInFilter === "CHECKED_IN") {
      if (!order.tickets.some((t) => t.status === "CHECKED_IN")) continue;
    }

    // Orders zijn oplopend gesorteerd, dus de laatste PAID order per e-mailadres wint.
    byEmail.set(order.buyerEmail.toLowerCase(), {
      email: order.buyerEmail,
      personalization: {
        ...customVars,
        ...brandingVars,
        voornaam: order.buyerName.split(" ")[0] ?? order.buyerName,
        event_naam: event.name,
        aantal_tickets: String(order.tickets.length),
        afmeldlink: buildUnsubscribeLinkHtml(order.buyerEmail),
      },
    });
  }

  return Array.from(byEmail.values());
}
