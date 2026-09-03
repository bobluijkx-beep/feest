import "server-only";
import { prisma } from "../db";
import { createMolliePayment } from "../mollie/client";
import { InsufficientStockError, InvalidDonationAmountError } from "./errors";
import { isValidDonationAmountCents } from "./donation";
import { scheduleOrderExpiry } from "./qstash";

const STOCK_HOLD_MINUTES = 15;

interface CreateOrderItem {
  productId: string;
  quantity: number;
  // Alleen voor kind=DONATION-producten: het bedrag dat de bezoeker koos (aangeklikte
  // standaardknop of het vrije veld) — priceCents van het product zelf is voor donaties
  // nominaal en wordt hier genegeerd. Voor elk ander product-soort wordt dit veld
  // genegeerd, ook als het (onverwacht) wordt meegestuurd.
  customAmountCents?: number;
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
        kind: string;
        priceCents: number;
        currency: string;
        totalStock: number;
        reservedStock: number;
        soldStock: number;
        isActive: boolean;
      }[]
    >`SELECT id, kind, "priceCents", currency, "totalStock", "reservedStock", "soldStock", "isActive"
      FROM "products" WHERE id = ANY(${productIds}) ORDER BY id FOR UPDATE`;

    const byId = new Map(lockedProducts.map((product) => [product.id, product]));

    // unitPriceCents per regel wordt hier apart bijgehouden i.p.v. later opnieuw uit byId
    // afgeleid: voor een donatie is dat namelijk NIET product.priceCents (nominaal, nooit
    // daadwerkelijk in rekening gebracht) maar het door de bezoeker gekozen bedrag.
    const resolvedItems: { productId: string; quantity: number; unitPriceCents: number }[] = [];
    let totalCents = 0;
    let currency = "EUR";
    for (const item of params.items) {
      const product = byId.get(item.productId);
      if (!product || !product.isActive) throw new Error("Artikel niet beschikbaar.");
      const available = product.totalStock - product.reservedStock - product.soldStock;
      if (available < item.quantity) throw new InsufficientStockError(product.id);

      let unitPriceCents: number;
      if (product.kind === "DONATION") {
        // Nooit product.priceCents vertrouwen voor een donatiebedrag — dat komt van de
        // bezoeker zelf (knop of vrij veld) en wordt hier, ongeacht de clientzijdige
        // weergave, opnieuw tegen de harde minimumgrens gecontroleerd.
        if (!isValidDonationAmountCents(item.customAmountCents)) {
          throw new InvalidDonationAmountError(product.id);
        }
        unitPriceCents = item.customAmountCents;
      } else {
        unitPriceCents = product.priceCents;
      }

      resolvedItems.push({ productId: item.productId, quantity: item.quantity, unitPriceCents });
      totalCents += unitPriceCents * item.quantity;
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
          create: resolvedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
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
