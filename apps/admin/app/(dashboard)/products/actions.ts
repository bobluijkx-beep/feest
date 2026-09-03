"use server";

import { revalidatePath } from "next/cache";
import { prisma, logAudit, uploadProductImage, isValidDonationAmountCents, DONATION_UNLIMITED_STOCK } from "@lions/core";
import type { ProductKind } from "@lions/db";
import { requireStaffRole } from "@/lib/require-role";

export interface ProductActionState {
  error?: string;
  success?: boolean;
}

const VALID_KINDS: ProductKind[] = ["TICKET", "MERCHANDISE", "DONATION"];

function parsePriceCents(raw: FormDataEntryValue | null): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

/** De 3 standaardbedragen voor een donatieproduct — elk moet net als het vrije "ander
 * bedrag"-veld op de site minimaal €2,50 zijn (zelfde grens, zie donation.ts), anders zou
 * de site een knop tonen die createOrder() vervolgens alsnog zou afwijzen. */
function parseDonationPresetsCents(formData: FormData): number[] | null {
  const cents = [1, 2, 3].map((n) => {
    const euros = Number(formData.get(`donationPreset${n}Euros`));
    return Number.isFinite(euros) ? Math.round(euros * 100) : NaN;
  });
  return cents.every(isValidDonationAmountCents) ? cents : null;
}

function getImageFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const eventId = String(formData.get("eventId") ?? "");
  const kind = String(formData.get("kind") ?? "") as ProductKind;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!eventId) return { error: "Kies een evenement." };
  if (!VALID_KINDS.includes(kind)) return { error: "Ongeldige soort." };
  if (!name) return { error: "Vul een naam in." };

  // Donatie heeft geen vaste prijs/voorraad — die velden komen niet eens uit het
  // formulier (zie create-product-form.tsx) en worden hier vervangen door de 3
  // standaardbedragen resp. een vaste "onbeperkt"-waarde (DONATION_UNLIMITED_STOCK).
  let priceCents: number;
  let totalStock: number;
  let donationPresetsCents: number[] = [];
  if (kind === "DONATION") {
    const presets = parseDonationPresetsCents(formData);
    if (!presets) return { error: "Vul 3 geldige standaardbedragen in (elk minimaal €2,50)." };
    donationPresetsCents = presets;
    priceCents = presets[0];
    totalStock = DONATION_UNLIMITED_STOCK;
  } else {
    const parsedPrice = parsePriceCents(formData.get("priceEuros"));
    if (parsedPrice === null) return { error: "Vul een geldige prijs in (groter dan 0)." };
    priceCents = parsedPrice;
    const parsedStock = Number(formData.get("totalStock"));
    if (!Number.isInteger(parsedStock) || parsedStock < 0) return { error: "Vul een geldig aantal in (0 of hoger)." };
    totalStock = parsedStock;
  }

  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { error: "Evenement niet gevonden." };

  const created = await prisma.product.create({
    data: { eventId, kind, name, description: description || null, priceCents, totalStock, donationPresetsCents },
  });

  // Het bestandspad in Storage is gebaseerd op het product-id, dat pas na het aanmaken
  // bekend is — daarom hier een tweede stap i.p.v. de afbeelding al bij het aanmaken zelf
  // meesturen (zelfde soort multi-step Server Action als createBulkCampaign).
  const image = getImageFile(formData);
  if (image) {
    const imageUrl = await uploadProductImage(created.id, image);
    await prisma.product.update({ where: { id: created.id }, data: { imageUrl } });
  }

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "product_created",
    entityType: "product",
    entityId: created.id,
    metadata: { name, kind, priceCents, totalStock, eventId },
  });

  revalidatePath("/products");
  return { success: true };
}

export async function updateProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const id = String(formData.get("id") ?? "");
  const kind = String(formData.get("kind") ?? "") as ProductKind;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!id) return { error: "Ontbrekend id." };
  if (!VALID_KINDS.includes(kind)) return { error: "Ongeldige soort." };
  if (!name) return { error: "Vul een naam in." };

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: "Product niet gevonden." };

  // Zelfde donatie-afwijking als createProduct: geen vaste prijs/voorraad, wél 3
  // standaardbedragen. Bij het (terug)wisselen naar TICKET/MERCHANDISE worden eventuele
  // eerder opgeslagen standaardbedragen leeggemaakt — ze zijn dan zinloos.
  let priceCents: number;
  let totalStock: number;
  let donationPresetsCents: number[] = [];
  if (kind === "DONATION") {
    const presets = parseDonationPresetsCents(formData);
    if (!presets) return { error: "Vul 3 geldige standaardbedragen in (elk minimaal €2,50)." };
    donationPresetsCents = presets;
    priceCents = presets[0];
    totalStock = DONATION_UNLIMITED_STOCK;
  } else {
    const parsedPrice = parsePriceCents(formData.get("priceEuros"));
    if (parsedPrice === null) return { error: "Vul een geldige prijs in (groter dan 0)." };
    priceCents = parsedPrice;
    const parsedStock = Number(formData.get("totalStock"));
    if (!Number.isInteger(parsedStock) || parsedStock < 0) return { error: "Vul een geldig aantal in (0 of hoger)." };
    const committed = existing.reservedStock + existing.soldStock;
    if (parsedStock < committed) {
      return { error: `Aantal kan niet lager dan ${committed} (al gereserveerd/verkocht).` };
    }
    totalStock = parsedStock;
  }

  const image = getImageFile(formData);
  const imageUrl = image ? await uploadProductImage(id, image) : undefined;

  await prisma.product.update({
    where: { id },
    data: { kind, name, description: description || null, priceCents, totalStock, donationPresetsCents, isActive, imageUrl },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "product_updated",
    entityType: "product",
    entityId: id,
    metadata: { name, kind, priceCents, totalStock, isActive },
  });

  revalidatePath("/products");
  return { success: true };
}

export async function deleteProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Ontbrekend id." };

  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderItemCount > 0) {
    return { error: "Dit product is al gebruikt in bestellingen — deactiveer het in plaats van verwijderen." };
  }

  await prisma.product.delete({ where: { id } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "product_deleted",
    entityType: "product",
    entityId: id,
  });

  revalidatePath("/products");
  return { success: true };
}
