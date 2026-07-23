import "server-only";
import { prisma } from "../db";

/** Bedoeld voor een Vercel Cron-taak: geeft de voorraad-hold van verlopen PENDING-orders
 * vrij zodat gestaakte checkouts geen tickets blijvend blokkeren. */
export async function expireStaleOrders(): Promise<number> {
  const staleOrders = await prisma.order.findMany({
    where: { status: "PENDING", stockHoldExpiresAt: { lt: new Date() } },
    include: { items: true },
  });

  for (const order of staleOrders) {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM "orders" WHERE id = ${order.id} FOR UPDATE`;
      if (locked[0]?.status !== "PENDING") return;

      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reservedStock: { decrement: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
    });
  }

  return staleOrders.length;
}
