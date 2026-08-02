import "server-only";
import { prisma } from "../db";
import { createMolliePayment } from "../mollie/client";
import { InsufficientStockError } from "./errors";
import { scheduleOrderExpiry } from "./qstash";

const STOCK_HOLD_MINUTES = 15;

interface CreateOrderItem {
  ticketTypeId?: string;
  productId?: string;
  quantity: number;
}

interface LockedStockRow {
  id: string;
  priceCents: number;
  currency: string;
  totalStock: number;
  reservedStock: number;
  soldStock: number;
  isActive: boolean;
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
    throw new Error("Ongeldige bestelling: geen artikelen geselecteerd.");
  }
  for (const item of params.items) {
    if (Boolean(item.ticketTypeId) === Boolean(item.productId)) {
      throw new Error("Ongeldige bestelling: elke regel moet precies één ticketsoort of product zijn.");
    }
  }

  const event = await prisma.event.findUniqueOrThrow({ where: { id: params.eventId } });

  const { orderId, totalCents, currency } = await prisma.$transaction(async (tx) => {
    // Vaste lock-volgorde (eerst alle TicketType's, dan alle Product's, elk intern
    // gesorteerd) voorkomt deadlocks tussen gelijktijdige checkouts die dezelfde
    // artikelen in verschillende volgorde zouden lock'en (zie architectuurvoorstel.md).
    const ticketTypeIds = [...new Set(params.items.filter((i) => i.ticketTypeId).map((i) => i.ticketTypeId!))].sort();
    const productIds = [...new Set(params.items.filter((i) => i.productId).map((i) => i.productId!))].sort();

    const lockedTicketTypes = ticketTypeIds.length
      ? await tx.$queryRaw<LockedStockRow[]>`SELECT id, "priceCents", currency, "totalStock", "reservedStock", "soldStock", "isActive"
          FROM "ticket_types" WHERE id = ANY(${ticketTypeIds}) ORDER BY id FOR UPDATE`
      : [];
    const lockedProducts = productIds.length
      ? await tx.$queryRaw<LockedStockRow[]>`SELECT id, "priceCents", currency, "totalStock", "reservedStock", "soldStock", "isActive"
          FROM "products" WHERE id = ANY(${productIds}) ORDER BY id FOR UPDATE`
      : [];

    const ticketTypeById = new Map(lockedTicketTypes.map((row) => [row.id, row]));
    const productById = new Map(lockedProducts.map((row) => [row.id, row]));

    let totalCents = 0;
    let currency = "EUR";
    for (const item of params.items) {
      const row = item.ticketTypeId ? ticketTypeById.get(item.ticketTypeId) : productById.get(item.productId!);
      if (!row || !row.isActive) throw new Error("Artikel niet beschikbaar.");
      const available = row.totalStock - row.reservedStock - row.soldStock;
      if (available < item.quantity) throw new InsufficientStockError(row.id);
      totalCents += row.priceCents * item.quantity;
      currency = row.currency;
    }

    for (const item of params.items) {
      if (item.ticketTypeId) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reservedStock: { increment: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId! },
          data: { reservedStock: { increment: item.quantity } },
        });
      }
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
            productId: item.productId,
            quantity: item.quantity,
            unitPriceCents: (item.ticketTypeId ? ticketTypeById.get(item.ticketTypeId) : productById.get(item.productId!))!
              .priceCents,
          })),
        },
      },
    });

    return { orderId: order.id, totalCents, currency };
  });

  // Plant de opruiming van déze order voor over 15 minuten (zie qstash.ts) i.p.v. te
  // vertrouwen op alleen de dagelijkse sweep. Bewust niet-blokkerend: als QStash zelf
  // niet bereikbaar is, mag dat de checkout niet laten mislukken — de dagelijkse cron
  // vangt het dan alsnog op, zij het pas na maximaal 24 uur.
  try {
    await scheduleOrderExpiry(orderId, `${params.webhookBaseUrl}/api/qstash/expire-order`);
  } catch (err) {
    console.error("Kon QStash-opruiming niet plannen voor order", orderId, err);
  }

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
    await tx.order.update({ where: { id: orderId }, data: { status: "FAILED" } });
  });
}
