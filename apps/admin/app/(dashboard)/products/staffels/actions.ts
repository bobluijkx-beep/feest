"use server";

import { revalidatePath } from "next/cache";
import { prisma, logAudit } from "@lions/core";
import type { PriceTierMode } from "@lions/db";
import { requireStaffRole } from "@/lib/require-role";

export interface TierGroupActionState {
  error?: string;
  success?: boolean;
}

interface Parsed {
  name: string;
  mode: PriceTierMode;
  freeEvery: number | null;
  tiers: { quantity: number; totalCents: number }[];
  productIds: string[];
}

function parseEuros(raw: string): number {
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
}

/** Leest en valideert het formulier; geeft een foutmelding of de schone waarden terug. */
function parseForm(formData: FormData): { error: string } | { value: Parsed } {
  const name = String(formData.get("name") ?? "").trim();
  const mode = String(formData.get("mode") ?? "") as PriceTierMode;
  const productIds = [...new Set(formData.getAll("productId").map(String))];

  if (!name) return { error: "Vul een naam in." };
  if (mode !== "EVERY_NTH_FREE" && mode !== "TIER_TABLE") return { error: "Kies een soort staffel." };
  if (productIds.length === 0) return { error: "Kies minstens één product voor deze staffel." };

  if (mode === "EVERY_NTH_FREE") {
    const freeEvery = Number(formData.get("freeEvery"));
    if (!Number.isInteger(freeEvery) || freeEvery < 2 || freeEvery > 100) {
      return { error: "Vul in welke keer gratis is (bv. 5 = elke 5e gratis), tussen 2 en 100." };
    }
    return { value: { name, mode, freeEvery, tiers: [], productIds } };
  }

  const quantityRaw = formData.getAll("tierQuantity").map((v) => String(v).trim());
  const eurosRaw = formData.getAll("tierEuros").map((v) => String(v).trim());
  const tiers: { quantity: number; totalCents: number }[] = [];
  for (let i = 0; i < quantityRaw.length; i++) {
    if (!quantityRaw[i] && !eurosRaw[i]) continue; // lege rij
    const quantity = Number(quantityRaw[i]);
    const totalCents = parseEuros(eurosRaw[i] ?? "");
    if (!Number.isInteger(quantity) || quantity < 2 || !Number.isInteger(totalCents) || totalCents <= 0) {
      return { error: "Elke staffelregel heeft een aantal van minstens 2 en een totaalprijs groter dan 0 nodig." };
    }
    tiers.push({ quantity, totalCents });
  }
  if (tiers.length === 0) return { error: "Voeg minstens één staffelregel toe." };
  if (new Set(tiers.map((t) => t.quantity)).size !== tiers.length) {
    return { error: "Elk aantal mag maar één keer in de staffellijst staan." };
  }
  return { value: { name, mode, freeEvery: null, tiers, productIds } };
}

/** Producten moeten van het event zijn, geen donatie, en dezelfde prijs per stuk hebben — de staffel
 * rekent met één stukprijs, dus een mix zou een onduidelijke uitkomst geven. */
async function validateProducts(eventId: string, productIds: string[], tiers: Parsed["tiers"]): Promise<string | null> {
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, eventId } });
  if (products.length !== productIds.length || products.some((p) => p.kind === "DONATION")) {
    return "Kies alleen tickets/producten van dit evenement.";
  }
  const price = products[0]?.priceCents;
  if (products.some((p) => p.priceCents !== price)) {
    return "Producten in één staffelgroep moeten dezelfde prijs per stuk hebben.";
  }
  if (price !== undefined) {
    const tooExpensive = tiers.find((t) => t.totalCents > t.quantity * price);
    if (tooExpensive) {
      return `Staffel ${tooExpensive.quantity} stuks kost meer dan ${tooExpensive.quantity} losse stuks — dat is geen korting.`;
    }
  }
  return null;
}

export async function createTierGroup(
  _prev: TierGroupActionState,
  formData: FormData,
): Promise<TierGroupActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const eventId = String(formData.get("eventId") ?? "");
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { error: "Kies een evenement." };

  const parsed = parseForm(formData);
  if ("error" in parsed) return parsed;
  const { value } = parsed;
  const productError = await validateProducts(eventId, value.productIds, value.tiers);
  if (productError) return { error: productError };

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.priceTierGroup.create({
      data: {
        eventId,
        name: value.name,
        mode: value.mode,
        freeEvery: value.freeEvery,
        tiers: { create: value.tiers },
      },
    });
    await tx.product.updateMany({ where: { id: { in: value.productIds } }, data: { priceTierGroupId: created.id } });
    return created;
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "price_tier_group_created",
    entityType: "price_tier_group",
    entityId: group.id,
    metadata: { name: value.name, mode: value.mode, freeEvery: value.freeEvery, tiers: value.tiers, products: value.productIds },
  });
  revalidatePath("/products/staffels");
  return { success: true };
}

export async function updateTierGroup(
  _prev: TierGroupActionState,
  formData: FormData,
): Promise<TierGroupActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.priceTierGroup.findUnique({ where: { id }, include: { event: true } });
  if (!existing || existing.event.organizationId !== actor.organizationId) return { error: "Staffelgroep niet gevonden." };

  const parsed = parseForm(formData);
  if ("error" in parsed) return parsed;
  const { value } = parsed;
  const productError = await validateProducts(existing.eventId, value.productIds, value.tiers);
  if (productError) return { error: productError };

  await prisma.$transaction(async (tx) => {
    await tx.priceTier.deleteMany({ where: { groupId: id } });
    await tx.priceTierGroup.update({
      where: { id },
      data: { name: value.name, mode: value.mode, freeEvery: value.freeEvery, tiers: { create: value.tiers } },
    });
    // Eerst alle leden losmaken, dan de gekozen producten koppelen: zo verdwijnt een product dat
    // niet meer is aangevinkt uit de groep.
    await tx.product.updateMany({ where: { priceTierGroupId: id }, data: { priceTierGroupId: null } });
    await tx.product.updateMany({ where: { id: { in: value.productIds } }, data: { priceTierGroupId: id } });
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "price_tier_group_updated",
    entityType: "price_tier_group",
    entityId: id,
    metadata: { name: value.name, mode: value.mode, freeEvery: value.freeEvery, tiers: value.tiers, products: value.productIds },
  });
  revalidatePath("/products/staffels");
  return { success: true };
}

/** Verwijdert de groep; de producten blijven bestaan (onDelete: SetNull) en gaan weer tegen de
 * normale prijs. Reeds afgeronde bestellingen houden hun vastgelegde prijzen. */
export async function deleteTierGroup(
  _prev: TierGroupActionState,
  formData: FormData,
): Promise<TierGroupActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.priceTierGroup.findUnique({ where: { id }, include: { event: true } });
  if (!existing || existing.event.organizationId !== actor.organizationId) return { error: "Staffelgroep niet gevonden." };

  await prisma.priceTierGroup.delete({ where: { id } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "price_tier_group_deleted",
    entityType: "price_tier_group",
    entityId: id,
    metadata: { name: existing.name },
  });
  revalidatePath("/products/staffels");
  return { success: true };
}
