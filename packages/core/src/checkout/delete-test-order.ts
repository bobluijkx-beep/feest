import "server-only";
import { prisma } from "../db";
import { getMollieMode } from "../settings/settings";

type DeleteResult = { ok: true } | { ok: false; error: string };

/** Verwijdert een testorder volledig (Ticket/OrderItem/CheckIn/Order) en corrigeert de
 * voorraad op basis van de status op het moment van locken — nooit een client-aangeleverde
 * status vertrouwen. Uitsluitend bedoeld voor het opruimen van testdata vóórdat de verkoop
 * live gaat: geblokkeerd zodra de organisatie's Mollie-modus op "live" staat, zodat een
 * ADMIN nooit per ongeluk een echte betaalde order kan wegklikken. */
export async function deleteTestOrder(orderId: string): Promise<DeleteResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { event: true } });
  if (!order) return { ok: false, error: "Bestelling niet gevonden." };

  const mode = await getMollieMode(order.event.organizationId);
  if (mode === "live") {
    return { ok: false, error: "Verwijderen is uitgeschakeld zolang Mollie op live staat." };
  }

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ status: string }[]>`
      SELECT status FROM "orders" WHERE id = ${orderId} FOR UPDATE`;
    const status = locked[0]?.status;
    if (!status) return { ok: false, error: "Bestelling niet gevonden." };

    const items = await tx.orderItem.findMany({ where: { orderId } });

    if (status === "PENDING") {
      for (const item of items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reservedStock: { decrement: item.quantity } },
        });
      }
    } else if (status === "PAID") {
      for (const item of items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldStock: { decrement: item.quantity } },
        });
      }
    }
    // EXPIRED/FAILED/CANCELLED/REFUNDED: voorraad is al eerder gecorrigeerd door de
    // webhook-/expire-/refund-logica, hier dus geen aanpassing nodig.

    await tx.checkIn.deleteMany({ where: { ticket: { orderId } } });
    await tx.ticket.deleteMany({ where: { orderId } });
    await tx.orderItem.deleteMany({ where: { orderId } });
    await tx.order.delete({ where: { id: orderId } });

    return { ok: true };
  });
}
