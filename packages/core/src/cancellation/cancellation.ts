import "server-only";
import { randomBytes } from "node:crypto";
import type { CancellationChoice } from "@lions/db";
import { prisma } from "../db";
import { refundOrderKeepingDonations } from "../checkout/refund-order";
import { sendEmail } from "../email/resend";
import { renderWithLayout } from "../email/layout";
import { getEmailLayoutHtml } from "../email/get-layout";
import { eventBrandingVars } from "../email/event-branding";
import { getCustomPlaceholderVars } from "../email/custom-placeholders";
import { defaultEmailTemplates } from "../email/default-templates";
import { getWebBaseUrl } from "../utils/base-url";
import type { SegmentRecipient } from "../email/segment";

const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 24 tekens uit 62 symbolen: de token is het enige wat de keuzepagina beschermt, dus ruim
 * genoeg om niet te raden. Alfanumeriek om dezelfde reden als de ticketlink-shortCode (geen
 * "_"/"-" die een messaging-app kan verknoeien). */
function generateToken(): string {
  const bytes = randomBytes(24);
  let token = "";
  for (let i = 0; i < 24; i++) token += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  return token;
}

type OrderWithItems = {
  items: { quantity: number; unitPriceCents: number; product: { kind: string } }[];
};

/** Splitst wat een koper betaalde in het deel voor tickets/producten (terug te betalen of te
 * doneren, de keuze van de annulering) en reeds gedane donaties (kind=DONATION) — die blijven
 * los van de keuze altijd bij het goede doel. */
function splitAmounts(orders: OrderWithItems[]): { refundableCents: number; donatedCents: number } {
  let refundableCents = 0;
  let donatedCents = 0;
  for (const order of orders) {
    for (const item of order.items) {
      const line = item.quantity * item.unitPriceCents;
      if (item.product.kind === "DONATION") donatedCents += line;
      else refundableCents += line;
    }
  }
  return { refundableCents, donatedCents };
}

const ORDER_ITEMS_FOR_AMOUNTS = { items: { select: { quantity: true, unitPriceCents: true, product: { select: { kind: true } } } } };

/** Zet het event op geannuleerd en maakt per koper met iets terug te betalen (tickets/producten)
 * een CancellationNotice (met persoonlijke token) aan. Kopers die uitsluitend hebben gedoneerd
 * krijgen geen notice: er valt niets te kiezen. Idempotent: een tweede aanroep voegt alleen
 * nieuwe kopers toe en laat bestaande notices (en hun keuze) ongemoeid. */
export async function cancelEvent(eventId: string): Promise<{ notices: number }> {
  const orders = await prisma.order.findMany({
    where: { eventId, isVisible: true, status: "PAID" },
    orderBy: { createdAt: "asc" },
    select: { buyerEmail: true, buyerName: true, ...ORDER_ITEMS_FOR_AMOUNTS },
  });

  const byEmail = new Map<string, { buyerName: string; orders: OrderWithItems[] }>();
  for (const order of orders) {
    const key = order.buyerEmail.toLowerCase();
    const entry = byEmail.get(key) ?? { buyerName: order.buyerName, orders: [] };
    entry.buyerName = order.buyerName;
    entry.orders.push(order);
    byEmail.set(key, entry);
  }

  await prisma.event.update({ where: { id: eventId }, data: { isCancelled: true } });

  let notices = 0;
  for (const [email, entry] of byEmail) {
    if (splitAmounts(entry.orders).refundableCents <= 0) continue;
    await prisma.cancellationNotice.upsert({
      where: { eventId_email: { eventId, email } },
      create: { eventId, email, buyerName: entry.buyerName, token: generateToken() },
      update: {},
    });
    notices++;
  }

  return { notices };
}

export interface CancellationNoticeView {
  id: string;
  token: string;
  email: string;
  buyerName: string;
  choice: CancellationChoice | null;
  isDefault: boolean;
  processedAt: Date | null;
  lastError: string | null;
  event: { id: string; slug: string; name: string; cancellationDeadline: Date | null };
  /** Tickets + producten (PAID of al REFUNDED): het bedrag waar de keuze over gaat. */
  amountCents: number;
  /** Reeds gedane donaties van deze koper — los van de keuze, blijven altijd staan. */
  donatedCents: number;
  /** Alleen bij choice = PARTIAL: het deel van amountCents dat de koper doneert. */
  chosenDonationCents: number | null;
}

async function amountsFor(eventId: string, email: string) {
  const orders = await prisma.order.findMany({
    where: {
      eventId,
      isVisible: true,
      status: { in: ["PAID", "REFUNDED"] },
      buyerEmail: { equals: email, mode: "insensitive" },
    },
    select: { buyerEmail: true, ...ORDER_ITEMS_FOR_AMOUNTS },
  });
  return splitAmounts(orders);
}

export async function getNoticeByToken(token: string): Promise<CancellationNoticeView | null> {
  const notice = await prisma.cancellationNotice.findUnique({
    where: { token },
    include: { event: { select: { id: true, slug: true, name: true, cancellationDeadline: true } } },
  });
  if (!notice) return null;
  const { refundableCents, donatedCents } = await amountsFor(notice.eventId, notice.email);
  return {
    id: notice.id,
    token: notice.token,
    email: notice.email,
    buyerName: notice.buyerName,
    choice: notice.choice,
    isDefault: notice.isDefault,
    processedAt: notice.processedAt,
    lastError: notice.lastError,
    event: notice.event,
    amountCents: refundableCents,
    // Na het kiezen de vastgelegde momentopname, niet opnieuw berekend: de keuze zelf maakt
    // donatieregels aan die anders als "eerdere donatie" zouden meetellen.
    donatedCents: notice.choice !== null && notice.earlierDonationCents !== null ? notice.earlierDonationCents : donatedCents,
    chosenDonationCents: notice.donationCents,
  };
}

/** Bedragen in één query ophalen en in JS per e-mailadres optellen i.p.v. één query per
 * koper: de gedeelde prisma-client heeft maar één connectie in de pool, dus N parallelle
 * queries wachten op elkaar en liepen bij veel kopers tegen de pool-time-out van 10 seconden
 * aan (de annuleringspagina gaf daardoor een server-side exception). */
export async function listNotices(eventId: string): Promise<CancellationNoticeView[]> {
  const notices = await prisma.cancellationNotice.findMany({ where: { eventId }, orderBy: { buyerName: "asc" } });
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    select: { id: true, slug: true, name: true, cancellationDeadline: true },
  });
  const orders = await prisma.order.findMany({
    where: { eventId, isVisible: true, status: { in: ["PAID", "REFUNDED"] } },
    select: { buyerEmail: true, ...ORDER_ITEMS_FOR_AMOUNTS },
  });

  const ordersByEmail = new Map<string, OrderWithItems[]>();
  for (const order of orders) {
    const key = order.buyerEmail.toLowerCase();
    ordersByEmail.set(key, [...(ordersByEmail.get(key) ?? []), order]);
  }

  return notices.map((n) => {
    const { refundableCents, donatedCents } = splitAmounts(ordersByEmail.get(n.email.toLowerCase()) ?? []);
    return {
      id: n.id,
      token: n.token,
      email: n.email,
      buyerName: n.buyerName,
      choice: n.choice,
      isDefault: n.isDefault,
      processedAt: n.processedAt,
      lastError: n.lastError,
      event,
      amountCents: refundableCents,
      donatedCents: n.choice !== null && n.earlierDonationCents !== null ? n.earlierDonationCents : donatedCents,
      chosenDonationCents: n.donationCents,
    };
  });
}

/** Legt de keuze van een koper vast en voert 'm uit. De keuze wordt eerst atomair "geclaimd"
 * (updateMany op choice = null): dubbel klikken of twee tabbladen kunnen zo nooit twee keer
 * terugbetalen of van gedachten veranderen. Daarna volgt pas de eigenlijke actie. */
export async function submitCancellationChoice(
  token: string,
  choice: CancellationChoice,
  options: { isDefault?: boolean; donationCents?: number } = {},
): Promise<{ ok: boolean; error?: "amount" }> {
  // PARTIAL: het te doneren bedrag moet echt een deel zijn — meer dan 0 en minder dan het
  // hele ticket-/productbedrag (alles doneren is gewoon DONATE, niets doneren is REFUND).
  // Server-side gecontroleerd; het formulier doet dat niet voor ons.
  const existing = await prisma.cancellationNotice.findUnique({ where: { token } });
  if (!existing) return { ok: false };
  const amounts = await amountsFor(existing.eventId, existing.email);

  let donationCents: number | null = null;
  if (choice === "PARTIAL") {
    const refundableCents = amounts.refundableCents;
    const d = options.donationCents;
    if (d === undefined || !Number.isInteger(d) || d <= 0 || d >= refundableCents) {
      return { ok: false, error: "amount" };
    }
    donationCents = d;
  }

  const claimed = await prisma.cancellationNotice.updateMany({
    where: { token, choice: null },
    data: {
      choice,
      chosenAt: new Date(),
      isDefault: options.isDefault ?? false,
      donationCents,
      earlierDonationCents: amounts.donatedCents,
    },
  });
  if (claimed.count === 0) return { ok: false };

  const notice = await prisma.cancellationNotice.findUniqueOrThrow({ where: { token } });
  await processNotice(notice.id);
  return { ok: true };
}

/** Voert de gekozen actie uit voor alle betaalde bestellingen van de koper: REFUND = Mollie-
 * terugbetaling van het ticket-/productdeel per bestelling (reeds gedane donaties blijven
 * staan, zie refundOrderKeepingDonations), DONATE = alleen de tickets annuleren — het geld
 * staat al bij ons en gaat niet heen en weer. Een mislukte terugbetaling laat processedAt leeg
 * en zet lastError, zodat de admin 'm kan herhalen. */
export async function processNotice(noticeId: string): Promise<void> {
  const notice = await prisma.cancellationNotice.findUniqueOrThrow({ where: { id: noticeId } });
  if (!notice.choice) return;

  const orders = await prisma.order.findMany({
    where: { eventId: notice.eventId, isVisible: true, status: "PAID", buyerEmail: { equals: notice.email, mode: "insensitive" } },
    select: { id: true },
  });
  const before = await amountsFor(notice.eventId, notice.email);

  const errors: string[] = [];
  if (notice.choice === "REFUND") {
    for (const order of orders) {
      const result = await refundOrderKeepingDonations(order.id);
      if (!result.ok) errors.push(`${order.id}: ${result.error}`);
    }
  } else if (notice.choice === "PARTIAL") {
    // Het terug te storten bedrag (totaal minus de gekozen donatie) wordt oudste bestelling
    // eerst over de bestellingen verdeeld; wat een bestelling niet terugkrijgt, wordt daar
    // gedoneerd. Bij een herhaling worden ook al afgeronde (REFUNDED) bestellingen meegeteld
    // in de verdeling, zodat die deterministisch dezelfde uitkomst geeft en alleen de nog
    // openstaande (PAID) bestellingen opnieuw worden uitgevoerd.
    const allOrders = await prisma.order.findMany({
      where: {
        eventId: notice.eventId,
        isVisible: true,
        status: { in: ["PAID", "REFUNDED"] },
        buyerEmail: { equals: notice.email, mode: "insensitive" },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, status: true, ...ORDER_ITEMS_FOR_AMOUNTS },
    });
    let remainingRefund = Math.max(before.refundableCents - (notice.donationCents ?? 0), 0);
    for (const order of allOrders) {
      const ticketProductCents = splitAmounts([order]).refundableCents;
      if (ticketProductCents <= 0) continue;
      const refundCents = Math.min(remainingRefund, ticketProductCents);
      remainingRefund -= refundCents;
      if (order.status !== "PAID") continue;
      if (refundCents === 0) {
        await prisma.ticket.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED" } });
        continue;
      }
      const result = await refundOrderKeepingDonations(order.id, { refundCents });
      if (!result.ok) errors.push(`${order.id}: ${result.error}`);
    }
  } else {
    await prisma.ticket.updateMany({
      where: { orderId: { in: orders.map((o) => o.id) } },
      data: { status: "CANCELLED" },
    });
  }

  if (errors.length > 0) {
    await prisma.cancellationNotice.update({ where: { id: noticeId }, data: { lastError: errors.join(" | ") } });
    return;
  }

  await prisma.cancellationNotice.update({
    where: { id: noticeId },
    data: { processedAt: new Date(), lastError: null },
  });
  // Niets te kiezen/terug te betalen (bv. alleen donaties) = geen bevestigingsmail.
  if (before.refundableCents > 0) {
    await sendChoiceConfirmationEmail(
      notice.id,
      notice.choice,
      before.refundableCents,
      notice.earlierDonationCents ?? before.donatedCents,
      notice.donationCents ?? 0,
    );
  }
}

/** Alle gemaakte keuzes waarvan de actie nog niet is afgerond (mislukte Mollie-refund) opnieuw
 * proberen. Eerder geslaagde bestellingen zijn dan al REFUNDED en worden dus overgeslagen. */
export async function retryFailedNotices(eventId: string): Promise<{ attempted: number }> {
  const failed = await prisma.cancellationNotice.findMany({
    where: { eventId, choice: { not: null }, processedAt: null },
    select: { id: true },
  });
  for (const n of failed) await processNotice(n.id);
  return { attempted: failed.length };
}

/** Beslissing bij de opzet: wie na de deadline niet heeft gekozen, krijgt het geld terug — een
 * donatie kan nooit zonder toestemming worden aangenomen. */
export async function finalizeNonResponders(eventId: string): Promise<{ refunded: number }> {
  const pending = await prisma.cancellationNotice.findMany({
    where: { eventId, choice: null },
    select: { token: true },
  });
  let refunded = 0;
  for (const n of pending) {
    const result = await submitCancellationChoice(n.token, "REFUND", { isDefault: true });
    if (result.ok) refunded++;
  }
  return { refunded };
}

/** Hangt per ontvanger de persoonlijke {{keuzelink}} aan de personalisatie van een mailing.
 * Ontvangers zonder notice (bv. een testadres) krijgen de gewone eventpagina, zodat de kale
 * placeholder-tekst nooit in een verstuurde mail blijft staan. Heeft het event nog geen
 * notices, dan wordt er niets toegevoegd. */
export async function attachCancellationLinks(
  eventId: string,
  recipients: SegmentRecipient[],
): Promise<SegmentRecipient[]> {
  const notices = await prisma.cancellationNotice.findMany({ where: { eventId }, select: { email: true, token: true } });
  if (notices.length === 0) return recipients;

  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    select: { slug: true, cancellationDeadline: true },
  });
  const base = getWebBaseUrl();
  const tokenByEmail = new Map(notices.map((n) => [n.email.toLowerCase(), n.token]));
  const deadline = event.cancellationDeadline
    ? formatDeadline(event.cancellationDeadline)
    : "zo snel mogelijk";

  return recipients.map((r) => {
    const token = tokenByEmail.get(r.email.toLowerCase());
    const keuzelink = token ? `${base}/${event.slug}/annulering/${token}` : `${base}/${event.slug}`;
    return { ...r, personalization: { ...r.personalization, keuzelink, deadline } };
  });
}

/** "12 oktober 2026" — Europe/Amsterdam, want de deadline wordt als kalenderdatum opgeslagen
 * (middag UTC), zodat de dag in Nederland altijd dezelfde is. */
export function formatDeadline(date: Date): string {
  return date.toLocaleDateString("nl-NL", { dateStyle: "long", timeZone: "Europe/Amsterdam" });
}

function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

const TEMPLATE_TYPE_BY_CHOICE = {
  REFUND: "CANCELLATION_REFUND",
  PARTIAL: "CANCELLATION_PARTIAL",
  DONATE: "CANCELLATION_DONATE",
} as const;

/** Bevestigingsmail na de keuze, opgebouwd uit het (door het bestuur bewerkbare) EmailTemplate
 * van dit event — of de standaardtekst uit default-templates.ts zolang er nog geen eigen
 * versie is opgeslagen onder E-mailtemplates. */
async function sendChoiceConfirmationEmail(
  noticeId: string,
  choice: CancellationChoice,
  amountCents: number,
  donatedCents: number,
  chosenDonationCents: number,
) {
  const notice = await prisma.cancellationNotice.findUniqueOrThrow({
    where: { id: noticeId },
    include: { event: { select: { id: true, name: true, theme: true, organizationId: true } } },
  });
  const type = TEMPLATE_TYPE_BY_CHOICE[choice];
  const templateRow = await prisma.emailTemplate.findUnique({
    where: { eventId_type_language: { eventId: notice.event.id, type, language: "nl" } },
  });
  const template = templateRow ?? defaultEmailTemplates[type];

  const voornaam = notice.buyerName.split(" ")[0] ?? notice.buyerName;
  const eerdereDonatie =
    donatedCents > 0
      ? `<p>Je eerder gedane donatie van <strong>${formatEuro(donatedCents)}</strong> blijft staan bij het goede doel — daar zijn we je dankbaar voor.</p>`
      : "";

  const [layoutHtml, brandingVars, customVars] = await Promise.all([
    getEmailLayoutHtml({ organizationId: notice.event.organizationId, layoutId: templateRow?.layoutId }),
    eventBrandingVars(notice.event.theme),
    getCustomPlaceholderVars(notice.event.organizationId),
  ]);
  const rendered = renderWithLayout({
    layoutHtml,
    content: template,
    vars: {
      ...customVars,
      ...brandingVars,
      voornaam,
      event_naam: notice.event.name,
      bedrag: formatEuro(amountCents),
      terugbetaald_bedrag: formatEuro(amountCents - chosenDonationCents),
      gedoneerd_bedrag: formatEuro(chosenDonationCents),
      eerdere_donatie: eerdereDonatie,
    },
  });
  await sendEmail({ to: notice.email, subject: rendered.subject, html: rendered.bodyHtml });
}
