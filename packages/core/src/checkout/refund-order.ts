import "server-only";
import { prisma } from "../db";
import { createMollieRefund } from "../mollie/client";

type RefundResult = { ok: true } | { ok: false; error: string };

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

  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ status: string }[]>`
      SELECT status FROM "orders" WHERE id = ${orderId} FOR UPDATE`;
    if (locked[0]?.status !== "PAID") return;

    for (const item of order.items) {
      if (item.ticketTypeId) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldStock: { decrement: item.quantity } },
        });
      } else if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { soldStock: { decrement: item.quantity } },
        });
      }
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
    await tx.ticket.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
  });

  return { ok: true };
}
