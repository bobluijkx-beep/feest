import "server-only";
import type { ProductKind } from "@lions/db";
import { prisma } from "../db";
import { eventBrandingVars } from "./event-branding";
import { getCustomPlaceholderVars } from "./custom-placeholders";
import { buildUnsubscribeLinkHtml } from "./unsubscribe";
import { SIMULATED_PAYMENT_PREFIX } from "../checkout/refund-order";

export interface EventSegment {
  type: "EVENT";
  eventId: string;
  /** Leeg/undefined = alle producttypes. */
  productKinds?: ProductKind[];
  /** Alleen zinvol voor events met TICKET-producten. */
  checkedInFilter?: "ANY" | "NOT_CHECKED_IN" | "CHECKED_IN";
  /** Alleen zinvol bij een geannuleerd event (zie cancellation.ts): NO_CHOICE_YET = alleen
   * kopers die nog niet via hun keuzelink hebben gekozen — voor de herinneringsmailing;
   * HAS_NOTICE = alleen kopers met een keuzelink (dus niet wie uitsluitend heeft gedoneerd en
   * dus niets te kiezen heeft) — voor de eerste keuzemail; TEST_ONLY = alleen de testkopers van
   * het annuleringsscherm (test-buyers.ts) — om de workflow te proberen zonder dat echte kopers
   * in de ontvangerslijst staan. */
  cancellationFilter?: "ANY" | "NO_CHOICE_YET" | "HAS_NOTICE" | "TEST_ONLY";
}

/** Het org-brede adresboek (packages/core/src/contacts/contacts.ts), minus iedereen die al
 * een betaalde bestelling heeft voor dít event — die heeft de informatie al via de eigen
 * orderbevestiging. `eventId` bepaalt dus alleen de uitsluiting (en events-toegangscontrole
 * voor EDITOR-gebruikers), niet de doelgroep zelf. */
export interface AddressBookSegment {
  type: "ADDRESS_BOOK";
  eventId: string;
}

export type CampaignSegment = EventSegment | AddressBookSegment;

const SERVICE_CANCELLATION_FILTERS = ["HAS_NOTICE", "NO_CHOICE_YET", "TEST_ONLY"];

/** Een servicebericht over de annulering van een event (keuzemail, herinnering, testverzending):
 * gaat alleen naar kopers met een annuleringsnotice en betreft hun eigen bestelling/betaling.
 * Zulke berichten horen — anders dan wervende mailings — ook afgemelde kopers te bereiken
 * (EmailOptOut geldt alleen voor wervende mails over dit en toekomstige evenementen). Werkt op
 * `unknown` zodat het ook op de opgeslagen EmailCampaign.segment (Json) toepasbaar is. */
export function isServiceSegment(segment: unknown): boolean {
  if (typeof segment !== "object" || segment === null) return false;
  const s = segment as { type?: unknown; cancellationFilter?: unknown };
  return s.type === "EVENT" && typeof s.cancellationFilter === "string" && SERVICE_CANCELLATION_FILTERS.includes(s.cancellationFilter);
}

export interface SegmentRecipient {
  email: string;
  /** Volledige naam, puur voor weergave in de admin (het selecteren van individuele
   * ontvangers, zie CampaignComposeForm) — voor de e-mail zelf wordt {{voornaam}} uit
   * personalization gebruikt. */
  name: string;
  personalization: Record<string, string>;
  /** Alleen gezet bij een servicebericht-doelgroep: deze koper heeft zich afgemeld voor wervende
   * mailings maar krijgt dit bericht toch (zie isServiceSegment). */
  optedOut?: boolean;
}

/** Bouwt de deelnemerslijst voor een segment. Filtert in JS i.p.v. geneste Prisma-where's
 * — zelfde stijl als de bestaande dashboard-aggregaties. Sluit e-mailadressen in
 * EmailOptOut altijd uit, zodat het preview-aantal in de admin al correct is. Toekomstige
 * segment-dimensies (bv. team) breiden CampaignSegment en deze functie uit zonder de
 * call-sites te raken. */
export async function buildSegmentRecipients(segment: CampaignSegment): Promise<SegmentRecipient[]> {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: segment.eventId },
    select: { name: true, theme: true, organizationId: true },
  });
  const [brandingVars, customVars] = await Promise.all([
    eventBrandingVars(event.theme),
    getCustomPlaceholderVars(event.organizationId),
  ]);

  if (segment.type === "ADDRESS_BOOK") {
    const [contacts, thisEventBuyers, optOuts] = await Promise.all([
      prisma.contact.findMany({ where: { organizationId: event.organizationId } }),
      prisma.order.findMany({ where: { eventId: segment.eventId, status: "PAID" }, select: { buyerEmail: true } }),
      prisma.emailOptOut.findMany({ select: { email: true } }),
    ]);
    // Nogmaals checken (niet vertrouwen dat het adresboek al schoon is) -- iemand kan zich
    // hebben afgemeld ná de laatste import/sync, of pas ná dit event een bestelling hebben
    // geplaatst die de vorige sync nog niet kende.
    const excluded = new Set([
      ...thisEventBuyers.map((o) => o.buyerEmail.toLowerCase()),
      ...optOuts.map((o) => o.email.toLowerCase()),
    ]);

    const byEmail = new Map<string, SegmentRecipient>();
    for (const contact of contacts) {
      const key = contact.email.toLowerCase();
      if (excluded.has(key)) continue;
      byEmail.set(key, {
        email: contact.email,
        name: contact.name,
        personalization: {
          ...customVars,
          ...brandingVars,
          voornaam: contact.name.split(" ")[0] ?? contact.name,
          event_naam: event.name,
          afmeldlink: buildUnsubscribeLinkHtml(contact.email),
        },
      });
    }
    return Array.from(byEmail.values());
  }

  const [orders, optOuts] = await Promise.all([
    prisma.order.findMany({
      where: { eventId: segment.eventId, status: "PAID" },
      include: { items: { include: { product: true } }, tickets: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.emailOptOut.findMany({ select: { email: true } }),
  ]);

  const optedOut = new Set(optOuts.map((o) => o.email.toLowerCase()));
  const byEmail = new Map<string, SegmentRecipient>();
  const service = isServiceSegment(segment);

  const testEmails =
    segment.cancellationFilter === "TEST_ONLY"
      ? new Set(
          (
            await prisma.order.findMany({
              where: { eventId: segment.eventId, molliePaymentId: { startsWith: SIMULATED_PAYMENT_PREFIX } },
              select: { buyerEmail: true },
            })
          ).map((o) => o.buyerEmail.toLowerCase()),
        )
      : null;

  const noticeEmails =
    segment.cancellationFilter === "NO_CHOICE_YET" || segment.cancellationFilter === "HAS_NOTICE"
      ? new Set(
          (
            await prisma.cancellationNotice.findMany({
              where: {
                eventId: segment.eventId,
                ...(segment.cancellationFilter === "NO_CHOICE_YET" ? { choice: null } : {}),
              },
              select: { email: true },
            })
          ).map((n) => n.email.toLowerCase()),
        )
      : null;

  for (const order of orders) {
    if (!service && optedOut.has(order.buyerEmail.toLowerCase())) continue;
    if (noticeEmails && !noticeEmails.has(order.buyerEmail.toLowerCase())) continue;
    if (testEmails && !testEmails.has(order.buyerEmail.toLowerCase())) continue;

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
      name: order.buyerName,
      personalization: {
        ...customVars,
        ...brandingVars,
        voornaam: order.buyerName.split(" ")[0] ?? order.buyerName,
        event_naam: event.name,
        aantal_tickets: String(order.tickets.length),
        afmeldlink: buildUnsubscribeLinkHtml(order.buyerEmail),
      },
      ...(service && optedOut.has(order.buyerEmail.toLowerCase()) ? { optedOut: true } : {}),
    });
  }

  return Array.from(byEmail.values());
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ad-hoc extra ontvangers los van de doelgroep-filters — voor bv. een testverzending naar
 * het eigen adres dat (nog) geen bestelling of adresboek-contact heeft. Nog steeds getoetst
 * aan EmailOptOut: ook een handmatig ingevuld testadres dat zich ooit heeft afgemeld, krijgt
 * geen mail. voornaam wordt afgeleid uit het deel vóór de @ — een redelijke gok zonder een
 * echte naam om op terug te vallen. */
export async function buildAdHocRecipients(eventId: string, rawEmails: string): Promise<SegmentRecipient[]> {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    select: { name: true, theme: true, organizationId: true },
  });
  const [brandingVars, customVars, optOuts] = await Promise.all([
    eventBrandingVars(event.theme),
    getCustomPlaceholderVars(event.organizationId),
    prisma.emailOptOut.findMany({ select: { email: true } }),
  ]);
  const optedOut = new Set(optOuts.map((o) => o.email.toLowerCase()));

  const emails = new Set<string>();
  for (const raw of rawEmails.split(/[\n,]/)) {
    const email = raw.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || optedOut.has(email)) continue;
    emails.add(email);
  }

  return Array.from(emails).map((email) => {
    const localPart = email.split("@")[0] ?? email;
    const voornaam = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    return {
      email,
      name: voornaam,
      personalization: {
        ...customVars,
        ...brandingVars,
        voornaam,
        event_naam: event.name,
        afmeldlink: buildUnsubscribeLinkHtml(email),
      },
    };
  });
}
