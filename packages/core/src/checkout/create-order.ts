import "server-only";
import { prisma } from "../db";
import { createMolliePayment } from "../mollie/client";
import { InsufficientStockError } from "./errors";
import { scheduleOrderExpiry } from "./qstash";

const STOCK_HOLD_MINUTES = 15;

interface CreateOrderItem {
  productId: string;
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
    throw new Error("Ongeldige bestelling: geen artikelen geselecteerd.");
  }

  const event = await prisma.event.findUniqueOrThrow({ where: { id: params.eventId } });

  const { orderId, totalCents, currency } = await prisma.$transaction(async (tx) => {
    const productIds = [...new Set(params.items.map((item) => item.productId))].sort();

    // FOR UPDATE + vaste sorteervolgorde: voorkomt overboeken bij gelijktijdige
    // aankopen en voorkomt deadlocks tussen concurrente checkouts die dezelfde
    // producten in verschillende volgorde zouden lock (zie architectuurvoorstel.md).
    const lockedProducts = await tx.$queryRaw<
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
      FROM "products" WHERE id = ANY(${productIds}) ORDER BY id FOR UPDATE`;

    const byId = new Map(lockedProducts.map((product) => [product.id, product]));

    let totalCents = 0;
    let currency = "EUR";
    for (const item of params.items) {
      const product = byId.get(item.productId);
      if (!product || !product.isActive) throw new Error("Artikel niet beschikbaar.");
      const available = product.totalStock - product.reservedStock - product.soldStock;
      if (available < item.quantity) throw new InsufficientStockError(product.id);
      totalCents += product.priceCents * item.quantity;
      currency = product.currency;
    }

    for (const item of params.items) {
      await tx.product.update({
        where: { id: item.productId },
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
            productId: item.productId,
            quantity: item.quantity,
            unitPriceCents: byId.get(item.productId)!.priceCents,
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
      await tx.product.update({
        where: { id: item.productId },
        data: { reservedStock: { decrement: item.quantity } },
      });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "FAILED" } });
  });
}
