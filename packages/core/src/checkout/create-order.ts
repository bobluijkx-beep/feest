import "server-only";
import { prisma } from "../db";
import { createMolliePayment } from "../mollie/client";
import { InsufficientStockError } from "./errors";

const STOCK_HOLD_MINUTES = 15;

interface CreateOrderItem {
  ticketTypeId: string;
  quantity: number;
}

export async function createOrder(params: {
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  items: CreateOrderItem[];
  redirectBaseUrl: string;
  webhookBaseUrl: string;
}): Promise<{ orderId: string; checkoutUrl: string }> {
  if (params.items.length === 0 || params.items.some((item) => item.quantity <= 0)) {
    throw new Error("Ongeldige bestelling: geen tickets geselecteerd.");
  }

  const event = await prisma.event.findUniqueOrThrow({ where: { id: params.eventId } });

  const { orderId, totalCents, currency } = await prisma.$transaction(async (tx) => {
    const ticketTypeIds = [...new Set(params.items.map((item) => item.ticketTypeId))].sort();

    // FOR UPDATE + vaste sorteervolgorde: voorkomt overboeken bij gelijktijdige
    // aankopen en voorkomt deadlocks tussen concurrente checkouts die dezelfde
    // ticketsoorten in verschillende volgorde zouden lock (zie architectuurvoorstel.md).
    const lockedTypes = await tx.$queryRaw<
      {
        id: string;
        priceCents: number;
        currency: string;
        totalStock: number;
        reservedStock: number;
        soldStock: number;
        isActive: boolean;
      }[]
    >`SELECT id, "priceCents", currency, "totalStock", "reservedStock", "soldStock", "isActive"
      FROM "ticket_types" WHERE id = ANY(${ticketTypeIds}) ORDER BY id FOR UPDATE`;

    const byId = new Map(lockedTypes.map((type) => [type.id, type]));

    let totalCents = 0;
    let currency = "EUR";
    for (const item of params.items) {
      const type = byId.get(item.ticketTypeId);
      if (!type || !type.isActive) throw new Error("Ticketsoort niet beschikbaar.");
      const available = type.totalStock - type.reservedStock - type.soldStock;
      if (available < item.quantity) throw new InsufficientStockError(type.id);
      totalCents += type.priceCents * item.quantity;
      currency = type.currency;
    }

    for (const item of params.items) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { reservedStock: { increment: item.quantity } },
      });
    }

    const order = await tx.order.create({
      data: {
        eventId: params.eventId,
        buyerName: params.buyerName,
        buyerEmail: params.buyerEmail,
        totalCents,
        currency,
        stockHoldExpiresAt: new Date(Date.now() + STOCK_HOLD_MINUTES * 60 * 1000),
        items: {
          create: params.items.map((item) => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            unitPriceCents: byId.get(item.ticketTypeId)!.priceCents,
          })),
        },
      },
    });

    return { orderId: order.id, totalCents, currency };
  });

  try {
    const payment = await createMolliePayment({
      organizationId: event.organizationId,
      orderId,
      totalCents,
      currency,
      description: `${event.name} — bestelling ${orderId}`,
      redirectUrl: `${params.redirectBaseUrl}/${event.slug}/bedankt?order=${orderId}`,
      webhookUrl: `${params.webhookBaseUrl}/api/mollie/webhook`,
    });

    const checkoutUrl = payment.getCheckoutUrl();
    if (!checkoutUrl) throw new Error("Mollie gaf geen checkout-URL terug.");

    await prisma.order.update({ where: { id: orderId }, data: { molliePaymentId: payment.id } });

    return { orderId, checkoutUrl };
  } catch (err) {
    // Mollie-aanmaak mislukt: reservering weer vrijgeven, order niet in PENDING laten hangen.
    await releaseOrderHold(orderId);
    throw err;
  }
}

async function releaseOrderHold(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    for (const item of order.items) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { reservedStock: { decrement: item.quantity } },
      });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "FAILED" } });
  });
}
