import "server-only";
import { prisma } from "../db";
import { createMollieRefund } from "../mollie/client";

type RefundResult = { ok: true } | { ok: false; error: string };

interface LockedOrderRow {
  status: string;
  molliePaymentId: string | null;
  totalCents: number;
  currency: string;
  eventId: string;
}

/** Terugbetaling via Mollie voor een betaalde order. De order-rij wordt gelockt over de
 * Mollie-call heen (verhoogde transactie-timeout) zodat twee snelle klikken nooit allebei
 * een refund bij Mollie kunnen triggeren — de tweede transactie wacht op de lock, ziet dan
 * dat de status al niet meer PAID is en faalt netjes zonder Mollie opnieuw aan te roepen. */
export async function refundOrder(orderId: string): Promise<RefundResult> {
  return prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<LockedOrderRow[]>`
        SELECT status, "molliePaymentId", "totalCents", currency, "eventId"
        FROM "orders" WHERE id = ${orderId} FOR UPDATE`;
      const row = locked[0];
      if (!row) return { ok: false, error: "Bestelling niet gevonden." };
      if (row.status !== "PAID") {
        return { ok: false, error: "Alleen betaalde bestellingen kunnen worden terugbetaald." };
      }
      if (!row.molliePaymentId) {
        return { ok: false, error: "Geen Mollie-betaling gekoppeld aan deze bestelling." };
      }

      const event = await tx.event.findUniqueOrThrow({ where: { id: row.eventId } });

      try {
        await createMollieRefund({
          organizationId: event.organizationId,
          molliePaymentId: row.molliePaymentId,
          amountCents: row.totalCents,
          currency: row.currency,
          description: `Terugbetaling bestelling ${orderId}`,
        });
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Onbekende fout bij Mollie-refund." };
      }

      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldStock: { decrement: item.quantity } },
        });
      }

      await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
      await tx.ticket.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });

      return { ok: true };
    },
    { timeout: 15000 },
  );
}
