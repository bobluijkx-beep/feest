import "server-only";
import { prisma } from "../db";
import { createMolliePayment } from "../mollie/client";
import { EventCancelledError, InsufficientStockError, InvalidDonationAmountError } from "./errors";
import { isValidDonationAmountCents } from "./donation";
import { scheduleOrderExpiry } from "./qstash";
import { splitBundlePriceCents } from "../products/bundles";
import { priceTierGroup, splitLineCents } from "../pricing/tiers";

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

interface CreateOrderBundleItem {
  bundleId: string;
  quantity: number;
}

// Eén regel vóór prijsresolutie: zowel een rechtstreeks besteld product als een uit een
// combi geëxplodeerd component eindigt hier in dezelfde vorm, zodat de
// voorraadcontrole/-reservering verderop niet hoeft te weten waar een regel oorspronkelijk
// vandaan kwam. Een combi-regel heeft `unitPriceCents` al (de prijsverdeling, zie
// splitBundlePriceCents); een rechtstreekse regel krijgt die pas na het opzoeken/valideren
// van het product (customAmountCents voor een donatie, anders product.priceCents).
interface RequestedLine {
  productId: string;
  quantity: number;
  bundleId?: string;
  unitPriceCents?: number;
  customAmountCents?: number;
}

interface ResolvedLine {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  bundleId?: string;
}

export async function createOrder(params: {
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  items: CreateOrderItem[];
  // Combi's (ProductBundle) — vallen hieronder uiteen in losse ResolvedLine's tegen de échte
  // onderliggende producten, zodat voorraad/tickets/dashboardcijfers via de bestaande
  // per-Product-logica blijven lopen (zie packages/core/src/products/bundles.ts).
  bundleItems?: CreateOrderBundleItem[];
  redirectBaseUrl: string;
  webhookBaseUrl: string;
  // Afkomstig uit het feest_ref-cookie (zie apps/web/middleware.ts), dus onbetrouwbare
  // publieke input — hieronder tegen een echte EmailCampaign-rij gevalideerd vóór gebruik,
  // in plaats van blind te vertrouwen dat het een bestaande campagne is.
  mailingCampaignId?: string;
}): Promise<{ orderId: string; checkoutUrl: string }> {
  const bundleItems = params.bundleItems ?? [];
  if (
    (params.items.length === 0 && bundleItems.length === 0) ||
    params.items.some((item) => item.quantity <= 0) ||
    bundleItems.some((item) => item.quantity <= 0)
  ) {
    throw new Error("Ongeldige bestelling: geen artikelen geselecteerd.");
  }

  const event = await prisma.event.findUniqueOrThrow({ where: { id: params.eventId } });
  if (event.isCancelled) throw new EventCancelledError();

  const mailingCampaignId = params.mailingCampaignId
    ? (await prisma.emailCampaign.findUnique({ where: { id: params.mailingCampaignId }, select: { id: true } }))?.id
    : undefined;

  // Nooit clientzijdig samengestelde combi-inhoud/prijs vertrouwen — hier opnieuw uit de
  // database opgehaald en tegen `eventId`/`isActive` gevalideerd, exact zoals bij een
  // gewoon product hieronder.
  const bundles =
    bundleItems.length > 0
      ? await prisma.productBundle.findMany({
          where: { id: { in: bundleItems.map((b) => b.bundleId) } },
          include: { items: { include: { product: true } } },
        })
      : [];
  const bundleById = new Map(bundles.map((b) => [b.id, b]));

  // Combi's vooraf (buiten de lock-transactie) "uitpakken" tot losse productregels — de
  // eigenlijke voorraadcontrole/-reservering hieronder behandelt ze daarna niet anders dan
  // rechtstreeks bestelde producten.
  const explodedBundleLines: RequestedLine[] = [];
  for (const requested of bundleItems) {
    const bundle = bundleById.get(requested.bundleId);
    if (!bundle || bundle.eventId !== params.eventId || !bundle.isActive || bundle.items.length === 0) {
      throw new Error("Combi niet beschikbaar.");
    }

    const perUnitSplit = splitBundlePriceCents(
      bundle.priceCents,
      bundle.items.map((i) => ({ productId: i.productId, weightCents: i.product.priceCents * i.quantity })),
    );

    for (const component of bundle.items) {
      const totalQuantity = component.quantity * requested.quantity;
      const totalCentsForComponent = (perUnitSplit.get(component.productId) ?? 0) * requested.quantity;
      explodedBundleLines.push({
        productId: component.productId,
        quantity: totalQuantity,
        unitPriceCents: Math.round(totalCentsForComponent / totalQuantity),
        bundleId: bundle.id,
      });
    }
  }

  const { orderId, totalCents, currency } = await prisma.$transaction(async (tx) => {
    const directLines: RequestedLine[] = params.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      customAmountCents: item.customAmountCents,
    }));
    const allRequestedLines: RequestedLine[] = [...directLines, ...explodedBundleLines];
    const productIds = [...new Set(allRequestedLines.map((line) => line.productId))].sort();

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
        priceTierGroupId: string | null;
      }[]
    >`SELECT id, kind, "priceCents", currency, "totalStock", "reservedStock", "soldStock", "isActive", "priceTierGroupId"
      FROM "products" WHERE id = ANY(${productIds}) ORDER BY id FOR UPDATE`;

    const byId = new Map(lockedProducts.map((product) => [product.id, product]));

    // Beschikbaarheid wordt per product ÉÉNMAAL over alle regels samen gecontroleerd (niet
    // per regel apart) — anders zou een los besteld product + datzelfde product als
    // combi-component allebei tegen dezelfde (nog niet bijgewerkte) voorraad worden
    // afgezet en zo samen kunnen overboeken.
    const requestedQtyByProduct = new Map<string, number>();
    for (const line of allRequestedLines) {
      requestedQtyByProduct.set(line.productId, (requestedQtyByProduct.get(line.productId) ?? 0) + line.quantity);
    }
    for (const [productId, requestedQty] of requestedQtyByProduct) {
      const product = byId.get(productId);
      if (!product || !product.isActive) throw new Error("Artikel niet beschikbaar.");
      const available = product.totalStock - product.reservedStock - product.soldStock;
      if (available < requestedQty) throw new InsufficientStockError(productId);
    }

    // unitPriceCents per regel wordt hier apart bijgehouden i.p.v. later opnieuw uit byId
    // afgeleid: voor een donatie is dat namelijk NIET product.priceCents (nominaal, nooit
    // daadwerkelijk in rekening gebracht) maar het door de bezoeker gekozen bedrag. Een
    // combi-regel heeft haar unitPriceCents al (de prijsverdeling hierboven) en slaat deze
    // stap dus over.
    // Staffelprijs: rechtstreeks bestelde (niet-combi, niet-donatie) regels van producten in een
    // PriceTierGroup van dit event worden per groep samen geprijsd — de stuks van alle producten
    // in de groep tellen mee (10 met + 10 zonder krenten = prijs van 20). Per regel wordt het
    // toegewezen totaal zo opgesplitst dat eenheidsprijs × aantal precies klopt.
    const tierGroupIds = [
      ...new Set(
        allRequestedLines
          .filter((l) => l.unitPriceCents === undefined)
          .map((l) => byId.get(l.productId))
          .filter((p) => p && p.kind !== "DONATION" && p.priceTierGroupId)
          .map((p) => p!.priceTierGroupId as string),
      ),
    ];
    const tierGroups =
      tierGroupIds.length > 0
        ? await tx.priceTierGroup.findMany({
            where: { id: { in: tierGroupIds }, eventId: params.eventId },
            include: { tiers: true },
          })
        : [];
    const tierPriced = new Map<number, { quantity: number; unitPriceCents: number }[]>();
    for (const group of tierGroups) {
      const members = allRequestedLines
        .map((line, index) => ({ line, index, product: byId.get(line.productId)! }))
        .filter((m) => m.line.unitPriceCents === undefined && m.product.priceTierGroupId === group.id);
      const result = priceTierGroup(
        { id: group.id, name: group.name, mode: group.mode, freeEvery: group.freeEvery, tiers: group.tiers },
        members.map((m) => ({ key: String(m.index), quantity: m.line.quantity, unitPriceCents: m.product.priceCents })),
      );
      for (const m of members) {
        tierPriced.set(m.index, splitLineCents(m.line.quantity, result.perLineCents.get(String(m.index)) ?? 0));
      }
    }

    const resolvedLines: ResolvedLine[] = [];
    let totalCents = 0;
    let currency = "EUR";
    for (const [index, line] of allRequestedLines.entries()) {
      const product = byId.get(line.productId)!;

      const tierParts = tierPriced.get(index);
      if (tierParts) {
        for (const part of tierParts) {
          resolvedLines.push({ productId: line.productId, quantity: part.quantity, unitPriceCents: part.unitPriceCents });
          totalCents += part.quantity * part.unitPriceCents;
        }
        currency = product.currency;
        continue;
      }

      let unitPriceCents: number;
      if (line.unitPriceCents !== undefined) {
        // Combi-regel: prijs is al vastgesteld (splitBundlePriceCents), niet opnieuw uit
        // het product afleiden.
        unitPriceCents = line.unitPriceCents;
      } else if (product.kind === "DONATION") {
        // Nooit product.priceCents vertrouwen voor een donatiebedrag — dat komt van de
        // bezoeker zelf (knop of vrij veld) en wordt hier, ongeacht de clientzijdige
        // weergave, opnieuw tegen de harde minimumgrens gecontroleerd.
        if (!isValidDonationAmountCents(line.customAmountCents)) {
          throw new InvalidDonationAmountError(product.id);
        }
        unitPriceCents = line.customAmountCents;
      } else {
        unitPriceCents = product.priceCents;
      }

      resolvedLines.push({ productId: line.productId, quantity: line.quantity, unitPriceCents, bundleId: line.bundleId });
      totalCents += unitPriceCents * line.quantity;
      currency = product.currency;
    }

    for (const line of resolvedLines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { reservedStock: { increment: line.quantity } },
      });
    }

    const order = await tx.order.create({
      data: {
        eventId: params.eventId,
        buyerName: params.buyerName,
        buyerEmail: params.buyerEmail,
        totalCents,
        currency,
        mailingCampaignId,
        stockHoldExpiresAt: new Date(Date.now() + STOCK_HOLD_MINUTES * 60 * 1000),
        items: {
          create: resolvedLines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            bundleId: line.bundleId ?? null,
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
