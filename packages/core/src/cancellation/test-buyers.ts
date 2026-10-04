import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../db";
import { signQrToken } from "../tickets/qr";
import { SIMULATED_PAYMENT_PREFIX } from "../checkout/refund-order";
import { cancelEvent } from "./cancellation";

type Result = { ok: true } | { ok: false; error: string };

/** Voegt een testkoper toe aan een event om de annuleringsworkflow (keuzepagina, e-mails,
 * terugbetalen/doneren, deels doneren) te kunnen proberen zonder Mollie: een betaalde order met
 * een gesimuleerd betaal-id (SIMULATED_PAYMENT_PREFIX) — de terugbetaling loopt dan volledig door
 * maar raakt Mollie niet. Voorraad en tickets worden net als bij een echte betaling bijgewerkt,
 * zodat annuleren/terugbetalen ze ook weer correct terugdraait. De mails gaan wél echt naar het
 * opgegeven adres, dus gebruik daar een eigen adres. Is het event al geannuleerd, dan krijgt de
 * testkoper meteen een keuzelink. */
export async function createTestBuyer(params: {
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  productId: string;
  quantity: number;
  donationCents: number;
}): Promise<Result> {
  const { eventId, productId, quantity, donationCents } = params;
  const buyerName = params.buyerName.trim();
  const buyerEmail = params.buyerEmail.trim();

  if (!buyerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return { ok: false, error: "Vul een naam en een geldig e-mailadres in." };
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return { ok: false, error: "Aantal moet tussen 1 en 20 liggen." };
  }
  if (!Number.isInteger(donationCents) || donationCents < 0) {
    return { ok: false, error: "Ongeldig donatiebedrag." };
  }

  const [event, product, donationProduct] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true, isCancelled: true } }),
    prisma.product.findUnique({ where: { id: productId } }),
    donationCents > 0
      ? prisma.product.findFirst({ where: { eventId, kind: "DONATION" }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  if (!event) return { ok: false, error: "Evenement niet gevonden." };
  if (!product || product.eventId !== eventId || product.kind === "DONATION") {
    return { ok: false, error: "Kies een ticket of product van dit evenement." };
  }
  if (donationCents > 0 && !donationProduct) {
    return { ok: false, error: "Dit evenement heeft geen donatieproduct om een donatie aan te koppelen." };
  }

  const totalCents = product.priceCents * quantity + donationCents;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        eventId,
        buyerName,
        buyerEmail,
        status: "PAID",
        totalCents,
        currency: product.currency,
        molliePaymentId: `${SIMULATED_PAYMENT_PREFIX}${randomBytes(8).toString("hex")}`,
        items: {
          create: [
            { productId: product.id, quantity, unitPriceCents: product.priceCents },
            ...(donationCents > 0 && donationProduct
              ? [{ productId: donationProduct.id, quantity: 1, unitPriceCents: donationCents }]
              : []),
          ],
        },
      },
    });
    await tx.product.update({ where: { id: product.id }, data: { soldStock: { increment: quantity } } });

    if (product.kind === "TICKET") {
      for (let i = 0; i < quantity; i++) {
        const ticket = await tx.ticket.create({
          data: { orderId: order.id, productId: product.id, qrToken: randomUUID() },
        });
        await tx.ticket.update({ where: { id: ticket.id }, data: { qrToken: signQrToken(ticket.id) } });
      }
    }
  });

  // Idempotent: voegt alleen de keuzelink van deze nieuwe koper toe.
  if (event.isCancelled) await cancelEvent(eventId);
  return { ok: true };
}

/** Telt de testkopers (orders met een gesimuleerd betaal-id) van een event. */
export async function countTestOrders(eventId: string): Promise<number> {
  return prisma.order.count({ where: { eventId, molliePaymentId: { startsWith: SIMULATED_PAYMENT_PREFIX } } });
}

/** Ruimt alle testkopers van een event op: de gesimuleerde orders plus de orders die de workflow
 * er voor dezelfde koper bij maakte (de losse donatie-order na een split) — nooit een echte
 * Mollie-betaling. Corrigeert de voorraad voor nog openstaande (PAID) orders en verwijdert de
 * keuzelink van een testkoper alleen als er voor dat adres geen orders meer overblijven. */
export async function deleteTestBuyers(eventId: string): Promise<{ orders: number }> {
  const simOrders = await prisma.order.findMany({
    where: { eventId, molliePaymentId: { startsWith: SIMULATED_PAYMENT_PREFIX } },
    select: { buyerEmail: true },
  });
  const emails = new Set(simOrders.map((o) => o.buyerEmail.toLowerCase()));
  if (emails.size === 0) return { orders: 0 };

  const candidates = await prisma.order.findMany({
    where: {
      eventId,
      OR: [
        { molliePaymentId: { startsWith: SIMULATED_PAYMENT_PREFIX } },
        { molliePaymentId: null, status: { in: ["PAID", "REFUNDED"] } },
      ],
    },
    include: { items: { include: { product: { select: { kind: true } } } } },
  });
  const toDelete = candidates.filter((o) => emails.has(o.buyerEmail.toLowerCase()));

  for (const order of toDelete) {
    await prisma.$transaction(async (tx) => {
      if (order.status === "PAID") {
        for (const item of order.items) {
          if (item.product.kind === "DONATION") continue;
          await tx.product.update({ where: { id: item.productId }, data: { soldStock: { decrement: item.quantity } } });
        }
      }
      await tx.checkIn.deleteMany({ where: { ticket: { orderId: order.id } } });
      await tx.ticket.deleteMany({ where: { orderId: order.id } });
      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
      await tx.songRequest.deleteMany({ where: { orderId: order.id } });
      await tx.order.delete({ where: { id: order.id } });
    });
  }

  for (const email of emails) {
    const remaining = await prisma.order.count({
      where: { eventId, buyerEmail: { equals: email, mode: "insensitive" } },
    });
    if (remaining === 0) {
      await prisma.cancellationNotice.deleteMany({ where: { eventId, email } });
    }
  }

  return { orders: toDelete.length };
}
