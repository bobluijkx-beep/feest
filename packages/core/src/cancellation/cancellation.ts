import "server-only";
import { randomBytes } from "node:crypto";
import type { CancellationChoice } from "@lions/db";
import { prisma } from "../db";
import { refundOrder } from "../checkout/refund-order";
import { sendEmail } from "../email/resend";
import { renderWithLayout } from "../email/layout";
import { getEmailLayoutHtml } from "../email/get-layout";
import { eventBrandingVars } from "../email/event-branding";
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

function paidOrdersWhere(eventId: string, email: string) {
  return { eventId, isVisible: true, status: "PAID" as const, buyerEmail: { equals: email, mode: "insensitive" as const } };
}

/** Zet het event op geannuleerd en maakt per koper met een betaalde, zichtbare bestelling een
 * CancellationNotice (met persoonlijke token) aan. Idempotent: een tweede aanroep voegt alleen
 * nieuwe kopers toe en laat bestaande notices (en hun keuze) ongemoeid. */
export async function cancelEvent(eventId: string): Promise<{ notices: number }> {
  const orders = await prisma.order.findMany({
    where: { eventId, isVisible: true, status: "PAID" },
    orderBy: { createdAt: "asc" },
    select: { buyerEmail: true, buyerName: true },
  });

  const byEmail = new Map<string, string>();
  for (const order of orders) byEmail.set(order.buyerEmail.toLowerCase(), order.buyerName);

  await prisma.event.update({ where: { id: eventId }, data: { isCancelled: true } });

  for (const [email, buyerName] of byEmail) {
    await prisma.cancellationNotice.upsert({
      where: { eventId_email: { eventId, email } },
      create: { eventId, email, buyerName, token: generateToken() },
      update: {},
    });
  }

  return { notices: byEmail.size };
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
  event: { id: string; slug: string; name: string };
  /** Som van alle PAID/REFUNDED, zichtbare bestellingen van deze koper voor het event — ook
   * ná een geslaagde terugbetaling (status REFUNDED) nog het oorspronkelijke bedrag. */
  amountCents: number;
}

async function amountFor(eventId: string, email: string): Promise<number> {
  const agg = await prisma.order.aggregate({
    where: {
      eventId,
      isVisible: true,
      status: { in: ["PAID", "REFUNDED"] },
      buyerEmail: { equals: email, mode: "insensitive" },
    },
    _sum: { totalCents: true },
  });
  return agg._sum.totalCents ?? 0;
}

export async function getNoticeByToken(token: string): Promise<CancellationNoticeView | null> {
  const notice = await prisma.cancellationNotice.findUnique({
    where: { token },
    include: { event: { select: { id: true, slug: true, name: true } } },
  });
  if (!notice) return null;
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
    amountCents: await amountFor(notice.eventId, notice.email),
  };
}

/** Bedragen in één query ophalen en in JS per e-mailadres optellen i.p.v. één aggregate per
 * koper: de gedeelde prisma-client heeft maar één connectie in de pool, dus N parallelle
 * queries wachten op elkaar en liepen bij veel kopers tegen de pool-time-out van 10 seconden
 * aan (de annuleringspagina gaf daardoor een server-side exception). */
export async function listNotices(eventId: string): Promise<CancellationNoticeView[]> {
  const notices = await prisma.cancellationNotice.findMany({ where: { eventId }, orderBy: { buyerName: "asc" } });
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, select: { id: true, slug: true, name: true } });
  const orders = await prisma.order.findMany({
    where: { eventId, isVisible: true, status: { in: ["PAID", "REFUNDED"] } },
    select: { buyerEmail: true, totalCents: true },
  });

  const amountByEmail = new Map<string, number>();
  for (const order of orders) {
    const key = order.buyerEmail.toLowerCase();
    amountByEmail.set(key, (amountByEmail.get(key) ?? 0) + order.totalCents);
  }

  return notices.map((n) => ({
    id: n.id,
    token: n.token,
    email: n.email,
    buyerName: n.buyerName,
    choice: n.choice,
    isDefault: n.isDefault,
    processedAt: n.processedAt,
    lastError: n.lastError,
    event,
    amountCents: amountByEmail.get(n.email.toLowerCase()) ?? 0,
  }));
}

/** Legt de keuze van een koper vast en voert 'm uit. De keuze wordt eerst atomair "geclaimd"
 * (updateMany op choice = null): dubbel klikken of twee tabbladen kunnen zo nooit twee keer
 * terugbetalen of van gedachten veranderen. Daarna volgt pas de eigenlijke actie. */
export async function submitCancellationChoice(
  token: string,
  choice: CancellationChoice,
  options: { isDefault?: boolean } = {},
): Promise<{ ok: boolean }> {
  const claimed = await prisma.cancellationNotice.updateMany({
    where: { token, choice: null },
    data: { choice, chosenAt: new Date(), isDefault: options.isDefault ?? false },
  });
  if (claimed.count === 0) return { ok: false };

  const notice = await prisma.cancellationNotice.findUniqueOrThrow({ where: { token } });
  await processNotice(notice.id);
  return { ok: true };
}

/** Voert de gekozen actie uit voor alle betaalde bestellingen van de koper: REFUND = Mollie-
 * terugbetaling per bestelling (refundOrder annuleert ook de tickets), DONATE = alleen de
 * tickets annuleren — het geld staat al bij ons en gaat niet heen en weer. Een mislukte
 * terugbetaling laat processedAt leeg en zet lastError, zodat de admin 'm kan herhalen. */
export async function processNotice(noticeId: string): Promise<void> {
  const notice = await prisma.cancellationNotice.findUniqueOrThrow({
    where: { id: noticeId },
    include: { event: { select: { id: true, organizationId: true } } },
  });
  if (!notice.choice) return;

  const orders = await prisma.order.findMany({
    where: paidOrdersWhere(notice.eventId, notice.email),
    select: { id: true },
  });
  const amountCents = await amountFor(notice.eventId, notice.email);

  const errors: string[] = [];
  if (notice.choice === "REFUND") {
    for (const order of orders) {
      const result = await refundOrder(order.id);
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
  await sendChoiceConfirmationEmail(notice.id, notice.choice, amountCents);
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

  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, select: { slug: true } });
  const base = getWebBaseUrl();
  const tokenByEmail = new Map(notices.map((n) => [n.email.toLowerCase(), n.token]));

  return recipients.map((r) => {
    const token = tokenByEmail.get(r.email.toLowerCase());
    const keuzelink = token ? `${base}/${event.slug}/annulering/${token}` : `${base}/${event.slug}`;
    return { ...r, personalization: { ...r.personalization, keuzelink } };
  });
}

function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

async function sendChoiceConfirmationEmail(noticeId: string, choice: CancellationChoice, amountCents: number) {
  const notice = await prisma.cancellationNotice.findUniqueOrThrow({
    where: { id: noticeId },
    include: { event: { select: { name: true, theme: true, organizationId: true } } },
  });
  const voornaam = notice.buyerName.split(" ")[0] ?? notice.buyerName;
  const amount = formatEuro(amountCents);

  const subject =
    choice === "REFUND"
      ? `Je terugbetaling voor ${notice.event.name}`
      : `Bedankt voor je donatie aan het goede doel`;
  const bodyHtml =
    choice === "REFUND"
      ? `<p>Beste ${voornaam},</p><p>We hebben je terugbetaling van <strong>${amount}</strong> voor <strong>${notice.event.name}</strong> in gang gezet. Het bedrag wordt teruggestort op de rekening waarmee je hebt betaald; dat kan enkele werkdagen duren.</p><p>Onze excuses dat het feest niet doorgaat.</p>`
      : `<p>Beste ${voornaam},</p><p>Hartelijk dank! Je hebt gekozen om <strong>${amount}</strong> van je bestelling voor <strong>${notice.event.name}</strong> te doneren aan ons goede doel. Je tickets zijn komen te vervallen en er wordt niets teruggestort.</p><p>Onze excuses dat het feest niet doorgaat — en bedankt voor je steun.</p>`;

  const [layoutHtml, brandingVars] = await Promise.all([
    getEmailLayoutHtml({ organizationId: notice.event.organizationId, layoutId: null }),
    eventBrandingVars(notice.event.theme),
  ]);
  const rendered = renderWithLayout({
    layoutHtml,
    content: { subject, bodyHtml },
    vars: { ...brandingVars, voornaam, event_naam: notice.event.name },
  });
  await sendEmail({ to: notice.email, subject: rendered.subject, html: rendered.bodyHtml });
}
