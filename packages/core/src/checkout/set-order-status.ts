import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { signQrToken } from "../tickets/qr";
import { InsufficientStockError } from "./errors";
import type { OrderStatus } from "@lions/db";

type SetStatusResult = { ok: true } | { ok: false; error: string };

type StockState = "RESERVED" | "SOLD" | "FREE";

/** PENDING houdt voorraad vast in reservedStock, PAID in soldStock, elke andere status
 * (EXPIRED/FAILED/CANCELLED/REFUNDED) houdt geen voorraad meer vast. Zelfde indeling als
 * create-order.ts/webhook.ts/refund-order.ts hanteren, hier alleen gegeneraliseerd zodat
 * een handmatige statuswijziging tussen willekeurige twee statussen kan. */
function stockStateFor(status: string): StockState {
  if (status === "PENDING") return "RESERVED";
  if (status === "PAID") return "SOLD";
  return "FREE";
}

/** Handmatige statuscorrectie in de admin — bv. een bestelling die buiten Mollie om
 * (bankoverschrijving, contant) alsnog betaald is, of een status die door een fout
 * verkeerd staat. Past voorraad (reservedStock/soldStock) en tickets automatisch aan op
 * basis van het verschil tussen de oude en nieuwe "voorraadstaat", zodat die nooit uit de
 * pas lopen met de status:
 * - weg van PAID: tickets worden CANCELLED
 * - naar PAID (en er bestaan nog geen tickets voor deze order): tickets worden aangemaakt
 *   voor TICKET-producten; bestaan er al (eerder geannuleerde) tickets, dan gaan die terug
 *   naar UNUSED in plaats van dat er dubbele tickets ontstaan
 * Stuurt bewust geen e-mail en doet géén externe Mollie-call — dat blijft de aparte
 * Terugbetalen-actie (refundOrder) resp. de e-mail-verstuurknop. Een handmatige overgang
 * náár REFUNDED betaalt dus niets terug; dat is uitsluitend voor het corrigeren van de
 * status zelf. */
export async function setOrderStatus(orderId: string, newStatus: OrderStatus): Promise<SetStatusResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM "orders" WHERE id = ${orderId} FOR UPDATE`;
      const currentStatus = locked[0]?.status;
      if (!currentStatus) throw new Error("Bestelling niet gevonden.");
      if (currentStatus === newStatus) return;

      const items = await tx.orderItem.findMany({ where: { orderId }, include: { product: true } });
      const productIds = [...new Set(items.map((item) => item.productId))].sort();
      const lockedProducts = await tx.$queryRaw<
        { id: string; totalStock: number; reservedStock: number; soldStock: number }[]
      >`SELECT id, "totalStock", "reservedStock", "soldStock" FROM "products" WHERE id = ANY(${productIds}) ORDER BY id FOR UPDATE`;
      const byId = new Map(lockedProducts.map((product) => [product.id, product]));

      const currentState = stockStateFor(currentStatus);
      const targetState = stockStateFor(newStatus);

      if (currentState !== targetState) {
        if (targetState !== "FREE") {
          for (const item of items) {
            const product = byId.get(item.productId)!;
            const releasedReserved = currentState === "RESERVED" ? item.quantity : 0;
            const releasedSold = currentState === "SOLD" ? item.quantity : 0;
            const availableAfterRelease =
              product.totalStock - (product.reservedStock - releasedReserved) - (product.soldStock - releasedSold);
            if (availableAfterRelease < item.quantity) throw new InsufficientStockError(item.productId);
          }
        }

        for (const item of items) {
          const data: Record<string, { increment: number } | { decrement: number }> = {};
          if (currentState === "RESERVED") data.reservedStock = { decrement: item.quantity };
          if (currentState === "SOLD") data.soldStock = { decrement: item.quantity };
          if (targetState === "RESERVED") data.reservedStock = { increment: item.quantity };
          if (targetState === "SOLD") data.soldStock = { increment: item.quantity };
          if (Object.keys(data).length > 0) {
            await tx.product.update({ where: { id: item.productId }, data });
          }
        }
      }

      const wasPaid = currentStatus === "PAID";
      const willBePaid = newStatus === "PAID";
      if (wasPaid && !willBePaid) {
        await tx.ticket.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
      } else if (!wasPaid && willBePaid) {
        const existingTickets = await tx.ticket.findMany({ where: { orderId } });
        if (existingTickets.length === 0) {
          for (const item of items) {
            if (item.product.kind !== "TICKET") continue;
            for (let i = 0; i < item.quantity; i++) {
              const ticket = await tx.ticket.create({
                data: { orderId, productId: item.productId, qrToken: randomUUID() },
              });
              await tx.ticket.update({ where: { id: ticket.id }, data: { qrToken: signQrToken(ticket.id) } });
            }
          }
        } else {
          await tx.ticket.updateMany({ where: { orderId, status: "CANCELLED" }, data: { status: "UNUSED" } });
        }
      }

      await tx.order.update({ where: { id: orderId }, data: { status: newStatus } });
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return { ok: false, error: "Niet genoeg voorraad meer om deze bestelling naar deze status te zetten." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Statuswijziging mislukt." };
  }

  return { ok: true };
}
