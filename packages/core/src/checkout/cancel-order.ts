import "server-only";
import { prisma } from "../db";

type CancelResult = { ok: true } | { ok: false; error: string };

/** Zet een order handmatig op inactief (CANCELLED) — de "deactiveren"-actie in de admin,
 * los van een echte terugbetaling (refundOrder.ts, alleen voor PAID + stuurt geld terug
 * via Mollie). Werkt op zowel PENDING (reservering vrijgeven) als PAID (verkochte
 * voorraad vrijgeven + tickets ongeldig maken) — zelfde locking-patroon als
 * refundOrder/expireStaleOrders: de externe status wordt niet gewijzigd (er is hier geen
 * externe call), dus alles gebeurt in één transactie. Stuurt bewust geen e-mail — dat is
 * een aparte, expliciete stap (sendCancelledEmail) zodat een board member kan kiezen of
 * de koper hierover bericht krijgt. */
export async function cancelOrder(orderId: string): Promise<CancelResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { ok: false, error: "Bestelling niet gevonden." };
  if (order.status !== "PENDING" && order.status !== "PAID") {
    return { ok: false, error: "Deze bestelling staat al op een eindstatus en kan niet meer gedeactiveerd worden." };
  }

  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ status: string }[]>`
      SELECT status FROM "orders" WHERE id = ${orderId} FOR UPDATE`;
    const currentStatus = locked[0]?.status;
    if (currentStatus !== "PENDING" && currentStatus !== "PAID") return;

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data:
          currentStatus === "PAID"
            ? { soldStock: { decrement: item.quantity } }
            : { reservedStock: { decrement: item.quantity } },
      });
    }
    if (currentStatus === "PAID") {
      await tx.ticket.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  });

  return { ok: true };
}
