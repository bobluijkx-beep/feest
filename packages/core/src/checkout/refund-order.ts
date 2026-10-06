import "server-only";
import { prisma } from "../db";
import { createMollieRefund, fetchMolliePayment } from "../mollie/client";

/** `alreadyRefunded`: Mollie meldde dat de betaling al volledig was terugbetaald (buiten de site
 * om, bv. rechtstreeks in het Mollie-dashboard) — er is dan niets meer terug te storten; de
 * bestelling is alleen in de database als terugbetaald bijgewerkt. */
export type RefundResult = { ok: true; alreadyRefunded?: boolean } | { ok: false; error: string };

/** Testorders van het annuleringsscherm (cancellation/test-buyers.ts) krijgen een betaal-id met
 * dit voorvoegsel i.p.v. een echt Mollie-id ("tr_…"): de workflow (status, tickets, voorraad,
 * mails) loopt dan volledig door, maar er wordt geen echte Mollie-refund gedaan. */
export const SIMULATED_PAYMENT_PREFIX = "sim_";

function isSimulatedPayment(molliePaymentId: string): boolean {
  return molliePaymentId.startsWith(SIMULATED_PAYMENT_PREFIX);
}

type MollieCheck = { kind: "refund" } | { kind: "simulated" } | { kind: "already" } | { kind: "error"; error: string };

/** Vraagt vóór elke terugbetaling aan Mollie hoeveel van de betaling nog terug te betalen is. Een
 * betaling die al volledig is terugbetaald (bv. handmatig in het Mollie-dashboard — Mollie stuurt
 * ons daar geen melding van) zou anders blijven mislukken met "The specified amount cannot be
 * refunded" terwijl de bestelling bij ons op PAID blijft staan. Is er nog maar een deel over
 * (eerder deels terugbetaald), dan geven we een duidelijke fout i.p.v. stilzwijgend een ander
 * bedrag terug te storten. */
async function checkMollieRefundable(
  organizationId: string,
  molliePaymentId: string,
  wantedCents: number,
): Promise<MollieCheck> {
  if (isSimulatedPayment(molliePaymentId)) return { kind: "simulated" };
  try {
    const payment = await fetchMolliePayment(organizationId, molliePaymentId);
    const remainingCents = Math.round(Number(payment.amountRemaining?.value ?? payment.amount.value) * 100);
    if (remainingCents <= 0) return { kind: "already" };
    if (remainingCents < wantedCents) {
      return {
        kind: "error",
        error: `Mollie meldt dat nog maar €${(remainingCents / 100).toFixed(2)} van deze betaling terugbetaald kan worden (eerder al deels terugbetaald) — €${(wantedCents / 100).toFixed(2)} gevraagd. Los dit handmatig in Mollie op.`,
      };
    }
    return { kind: "refund" };
  } catch (err) {
    return { kind: "error", error: err instanceof Error ? err.message : "Kon de betaling niet bij Mollie opvragen." };
  }
}

/** Zet een bestelling in de database op volledig terugbetaald: voorraad terug, tickets
 * geannuleerd, status REFUNDED. Gedeeld door een gewone refund en door een bestelling die
 * (buiten de site om) al in Mollie was terugbetaald. */
async function finalizeFullRefund(orderId: string, items: { productId: string; quantity: number }[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ status: string }[]>`
      SELECT status FROM "orders" WHERE id = ${orderId} FOR UPDATE`;
    if (locked[0]?.status !== "PAID") return;

    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { soldStock: { decrement: item.quantity } },
      });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
    await tx.ticket.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
  });
}

/** Terugbetaling voor een annulering: alleen tickets/producten gaan terug, een reeds gedane
 * donatie (kind=DONATION-regels) blijft bij het goede doel. Zonder donatieregels is dit gewoon
 * refundOrder. Met donatieregels: gedeeltelijke Mollie-refund van het niet-donatiebedrag, en de
 * order wordt daarna gesplitst — de oorspronkelijke order (tickets/producten) krijgt status
 * REFUNDED en het teruggestorte bedrag als totaal, de donatieregels verhuizen naar een nieuwe
 * PAID-order. Zo blijven omzet-, producten- en donatiecijfers elk kloppen, i.p.v. dat een
 * gemengde order als geheel op REFUNDED of PAID blijft staan. Een order met alléén donaties
 * blijft ongemoeid (niets terug te betalen). Was de betaling al volledig in Mollie
 * terugbetaald, dan wordt de order alleen als terugbetaald bijgewerkt (geen donatie-split: er
 * is geen geld meer om te doneren). */
export async function refundOrderKeepingDonations(
  orderId: string,
  options: { refundCents?: number } = {},
): Promise<RefundResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { event: true, items: { include: { product: { select: { kind: true } } } } },
  });
  if (!order) return { ok: false, error: "Bestelling niet gevonden." };
  if (order.status !== "PAID") {
    return { ok: false, error: "Alleen betaalde bestellingen kunnen worden terugbetaald." };
  }

  const donationItems = order.items.filter((item) => item.product.kind === "DONATION");
  const donationCents = donationItems.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  const ticketProductCents = order.totalCents - donationCents;
  // options.refundCents: terug te betalen deel van het ticket-/productbedrag (de keuze "deels
  // doneren"); de rest (keptCents) wordt dan ook gedoneerd en vastgelegd als donatie.
  const refundCents = Math.min(options.refundCents ?? ticketProductCents, ticketProductCents);
  const keptCents = ticketProductCents - refundCents;
  if (donationItems.length === 0 && keptCents === 0) return refundOrder(orderId);
  if (refundCents <= 0) return { ok: true };
  if (!order.molliePaymentId) {
    return { ok: false, error: "Geen Mollie-betaling gekoppeld aan deze bestelling." };
  }

  const check = await checkMollieRefundable(order.event.organizationId, order.molliePaymentId, refundCents);
  if (check.kind === "error") return { ok: false, error: check.error };
  if (check.kind === "already") {
    await finalizeFullRefund(orderId, order.items);
    return { ok: true, alreadyRefunded: true };
  }

  if (check.kind === "refund") {
    try {
      await createMollieRefund({
        organizationId: order.event.organizationId,
        molliePaymentId: order.molliePaymentId,
        amountCents: refundCents,
        currency: order.currency,
        description: `Terugbetaling bestelling ${orderId} (excl. donatie)`,
      });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Onbekende fout bij Mollie-refund." };
    }
  }

  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ status: string }[]>`
      SELECT status FROM "orders" WHERE id = ${orderId} FOR UPDATE`;
    if (locked[0]?.status !== "PAID") return;

    for (const item of order.items) {
      if (item.product.kind === "DONATION") continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { soldStock: { decrement: item.quantity } },
      });
    }

    const donationOrder = await tx.order.create({
      data: {
        eventId: order.eventId,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        status: "PAID",
        totalCents: donationCents + keptCents,
        currency: order.currency,
        isVisible: order.isVisible,
        mailingCampaignId: order.mailingCampaignId,
      },
    });
    if (donationItems.length > 0) {
      await tx.orderItem.updateMany({
        where: { id: { in: donationItems.map((item) => item.id) } },
        data: { orderId: donationOrder.id },
      });
    }
    // Het deel dat de koper bij "deels doneren" laat staan, als regel van het donatieproduct van
    // het event zodat het in de donatiecijfers meetelt (ontbreekt zo'n product, dan staat het
    // bedrag alleen in het ordertotaal).
    if (keptCents > 0) {
      const donationProduct = await tx.product.findFirst({
        where: { eventId: order.eventId, kind: "DONATION" },
        select: { id: true },
      });
      if (donationProduct) {
        await tx.orderItem.create({
          data: { orderId: donationOrder.id, productId: donationProduct.id, quantity: 1, unitPriceCents: keptCents },
        });
      }
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED", totalCents: refundCents } });
    await tx.ticket.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
  });

  return { ok: true };
}

/** Terugbetaling via Mollie voor een betaalde order. Zelfde patroon als
 * processMolliePaymentWebhook (webhook.ts): de externe Mollie-call gebeurt buiten elke
 * transactie — de gedeelde `prisma`-client heeft hier maar één connectie in de pool, dus
 * een geneste query (zoals getMollieApiKey's Setting-lookup) binnen een open transactie
 * zou verhongeren. Na een geslaagde refund wordt de status pas binnen een korte,
 * gelockte transactie omgezet; Mollie's eigen "amountRemaining"-boekhouding voorkomt zelf
 * al dat twee snelle klikken de volledige order-som dubbel terugbetalen. */
export async function refundOrder(orderId: string): Promise<RefundResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { event: true, items: true } });
  if (!order) return { ok: false, error: "Bestelling niet gevonden." };
  if (order.status !== "PAID") {
    return { ok: false, error: "Alleen betaalde bestellingen kunnen worden terugbetaald." };
  }
  if (!order.molliePaymentId) {
    return { ok: false, error: "Geen Mollie-betaling gekoppeld aan deze bestelling." };
  }

  const check = await checkMollieRefundable(order.event.organizationId, order.molliePaymentId, order.totalCents);
  if (check.kind === "error") return { ok: false, error: check.error };

  if (check.kind === "refund") {
    try {
      await createMollieRefund({
        organizationId: order.event.organizationId,
        molliePaymentId: order.molliePaymentId,
        amountCents: order.totalCents,
        currency: order.currency,
        description: `Terugbetaling bestelling ${orderId}`,
      });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Onbekende fout bij Mollie-refund." };
    }
  }

  await finalizeFullRefund(orderId, order.items);
  return check.kind === "already" ? { ok: true, alreadyRefunded: true } : { ok: true };
}
