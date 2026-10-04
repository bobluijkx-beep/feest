import "server-only";
import { prisma } from "../db";
import { createMollieRefund } from "../mollie/client";

type RefundResult = { ok: true } | { ok: false; error: string };

/** Testorders van het annuleringsscherm (cancellation/test-buyers.ts) krijgen een betaal-id met
 * dit voorvoegsel i.p.v. een echt Mollie-id ("tr_…"): de workflow (status, tickets, voorraad,
 * mails) loopt dan volledig door, maar er wordt geen echte Mollie-refund gedaan. */
export const SIMULATED_PAYMENT_PREFIX = "sim_";

function isSimulatedPayment(molliePaymentId: string): boolean {
  return molliePaymentId.startsWith(SIMULATED_PAYMENT_PREFIX);
}

/** Terugbetaling via Mollie voor een betaalde order. Zelfde patroon als
 * processMolliePaymentWebhook (webhook.ts): de externe Mollie-call gebeurt buiten elke
 * transactie — de gedeelde `prisma`-client heeft hier maar één connectie in de pool, dus
 * een geneste query (zoals getMollieApiKey's Setting-lookup) binnen een open transactie
 * zou verhongeren. Na een geslaagde refund wordt de status pas binnen een korte,
 * gelockte transactie omgezet; Mollie's eigen "amountRemaining"-boekhouding voorkomt zelf
 * al dat twee snelle klikken de volledige order-som dubbel terugbetalen. */
/** Terugbetaling voor een annulering: alleen tickets/producten gaan terug, een reeds gedane
 * donatie (kind=DONATION-regels) blijft bij het goede doel. Zonder donatieregels is dit gewoon
 * refundOrder. Met donatieregels: gedeeltelijke Mollie-refund van het niet-donatiebedrag, en de
 * order wordt daarna gesplitst — de oorspronkelijke order (tickets/producten) krijgt status
 * REFUNDED en het teruggestorte bedrag als totaal, de donatieregels verhuizen naar een nieuwe
 * PAID-order. Zo blijven omzet-, producten- en donatiecijfers elk kloppen, i.p.v. dat een
 * gemengde order als geheel op REFUNDED of PAID blijft staan. Een order met alléén donaties
 * blijft ongemoeid (niets terug te betalen). */
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

  try {
    if (!isSimulatedPayment(order.molliePaymentId)) await createMollieRefund({
      organizationId: order.event.organizationId,
      molliePaymentId: order.molliePaymentId,
      amountCents: refundCents,
      currency: order.currency,
      description: `Terugbetaling bestelling ${orderId} (excl. donatie)`,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Onbekende fout bij Mollie-refund." };
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

export async function refundOrder(orderId: string): Promise<RefundResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { event: true, items: true } });
  if (!order) return { ok: false, error: "Bestelling niet gevonden." };
  if (order.status !== "PAID") {
    return { ok: false, error: "Alleen betaalde bestellingen kunnen worden terugbetaald." };
  }
  if (!order.molliePaymentId) {
    return { ok: false, error: "Geen Mollie-betaling gekoppeld aan deze bestelling." };
  }

  try {
    if (!isSimulatedPayment(order.molliePaymentId)) await createMollieRefund({
      organizationId: order.event.organizationId,
      molliePaymentId: order.molliePaymentId,
      amountCents: order.totalCents,
      currency: order.currency,
      description: `Terugbetaling bestelling ${orderId}`,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Onbekende fout bij Mollie-refund." };
  }

  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ status: string }[]>`
      SELECT status FROM "orders" WHERE id = ${orderId} FOR UPDATE`;
    if (locked[0]?.status !== "PAID") return;

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { soldStock: { decrement: item.quantity } },
      });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
    await tx.ticket.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
  });

  return { ok: true };
}
