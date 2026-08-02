import "server-only";
import { prisma } from "../db";

async function expireOrderInTransaction(
  orderId: string,
  items: { ticketTypeId: string | null; productId: string | null; quantity: number }[],
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ status: string }[]>`
      SELECT status FROM "orders" WHERE id = ${orderId} FOR UPDATE`;
    if (locked[0]?.status !== "PENDING") return false;

    for (const item of items) {
      if (item.ticketTypeId) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reservedStock: { decrement: item.quantity } },
        });
      } else if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { reservedStock: { decrement: item.quantity } },
        });
      }
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "EXPIRED" } });
    return true;
  });
}

/** Vangnet voor een Vercel Cron-taak (1x/dag op het Hobby-plan): expireOrderIfStale
 * draait normaal al per order via een QStash-uitgestelde aanroep 15 minuten na aanmaak
 * (zie qstash.ts) — dit is de backstop voor het zeldzame geval dat die ene aanroep nooit
 * aankomt. */
export async function expireStaleOrders(): Promise<number> {
  const staleOrders = await prisma.order.findMany({
    where: { status: "PENDING", stockHoldExpiresAt: { lt: new Date() } },
    include: { items: true },
  });

  let count = 0;
  for (const order of staleOrders) {
    const expired = await expireOrderInTransaction(order.id, order.items);
    if (expired) count++;
  }
  return count;
}

/** Verwerkt de QStash-uitgestelde aanroep voor één specifieke order. Idempotent: als de
 * order intussen al PAID/FAILED/CANCELLED/EXPIRED is, of de hold nog niet echt verlopen
 * is, gebeurt er niets. */
export async function expireOrderIfStale(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status !== "PENDING") return false;
  if (!order.stockHoldExpiresAt || order.stockHoldExpiresAt > new Date()) return false;

  return expireOrderInTransaction(order.id, order.items);
}
