import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { fetchMolliePayment } from "../mollie/client";
import { signQrToken } from "../tickets/qr";
import { sendOrderConfirmationEmail, sendPaymentFailedEmail } from "../email/order-confirmation";

const TERMINAL_MOLLIE_STATUS: Record<string, "FAILED" | "CANCELLED" | "EXPIRED"> = {
  failed: "FAILED",
  canceled: "CANCELLED",
  expired: "EXPIRED",
};

/** Mollie's webhook-body bevat alleen het payment-id — de status wordt hier altijd
 * opnieuw bij Mollie zelf opgehaald, nooit uit de request vertrouwd. Idempotent:
 * herhaalde/vertraagde meldingen wijzigen een order maar één keer (de Order-rij wordt
 * gelockt en alleen een PENDING-order wordt nog verwerkt). */
export async function processMolliePaymentWebhook(molliePaymentId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { molliePaymentId },
    include: { event: true, items: true },
  });
  if (!order || order.status !== "PENDING") return;

  const payment = await fetchMolliePayment(order.event.organizationId, molliePaymentId);

  let becamePaid = false;
  let becameTerminalFailure = false;

  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ status: string }[]>`
      SELECT status FROM "orders" WHERE id = ${order.id} FOR UPDATE`;
    if (locked[0]?.status !== "PENDING") return;

    if (payment.status === "paid") {
      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reservedStock: { decrement: item.quantity }, soldStock: { increment: item.quantity } },
        });
        for (let i = 0; i < item.quantity; i++) {
          const ticket = await tx.ticket.create({
            data: { orderId: order.id, ticketTypeId: item.ticketTypeId, qrToken: randomUUID() },
          });
          await tx.ticket.update({ where: { id: ticket.id }, data: { qrToken: signQrToken(ticket.id) } });
        }
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      becamePaid = true;
      return;
    }

    const mappedStatus = TERMINAL_MOLLIE_STATUS[payment.status];
    if (mappedStatus) {
      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reservedStock: { decrement: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: mappedStatus } });
      becameTerminalFailure = true;
    }
    // "open"/"pending"/"authorized": nog niets doen, een volgende webhook-call beslist.
  });

  // Fase 1/2: synchroon versturen. Zodra QStash is aangesloten (fase 3+) verplaatst dit
  // naar de queue, zodat een trage e-mailprovider de webhook-respons niet blokkeert.
  if (becamePaid) {
    await sendOrderConfirmationEmail(order.id);
  } else if (becameTerminalFailure) {
    await sendPaymentFailedEmail(order.id);
  }
}
