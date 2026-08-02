"use server";

import { revalidatePath } from "next/cache";
import { prisma, logAudit } from "@lions/core";
import type { ProductKind } from "@lions/db";
import { requireStaffRole } from "@/lib/require-role";

export interface ProductActionState {
  error?: string;
  success?: boolean;
}

const VALID_KINDS: ProductKind[] = ["TICKET", "MERCHANDISE"];

function parsePriceCents(raw: FormDataEntryValue | null): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
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
  const priceCents = parsePriceCents(formData.get("priceEuros"));
  const totalStock = Number(formData.get("totalStock"));

  if (!eventId) return { error: "Kies een evenement." };
  if (!VALID_KINDS.includes(kind)) return { error: "Ongeldige soort." };
  if (!name) return { error: "Vul een naam in." };
  if (priceCents === null) return { error: "Vul een geldige prijs in (groter dan 0)." };
  if (!Number.isInteger(totalStock) || totalStock < 0) return { error: "Vul een geldig aantal in (0 of hoger)." };

  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { error: "Evenement niet gevonden." };

  const created = await prisma.product.create({
    data: { eventId, kind, name, description: description || null, priceCents, totalStock },
  });

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
  const priceCents = parsePriceCents(formData.get("priceEuros"));
  const totalStock = Number(formData.get("totalStock"));
  const isActive = formData.get("isActive") === "on";

  if (!id) return { error: "Ontbrekend id." };
  if (!VALID_KINDS.includes(kind)) return { error: "Ongeldige soort." };
  if (!name) return { error: "Vul een naam in." };
  if (priceCents === null) return { error: "Vul een geldige prijs in (groter dan 0)." };
  if (!Number.isInteger(totalStock) || totalStock < 0) return { error: "Vul een geldig aantal in (0 of hoger)." };

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: "Product niet gevonden." };

  const committed = existing.reservedStock + existing.soldStock;
  if (totalStock < committed) {
    return { error: `Aantal kan niet lager dan ${committed} (al gereserveerd/verkocht).` };
  }

  await prisma.product.update({
    where: { id },
    data: { kind, name, description: description || null, priceCents, totalStock, isActive },
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
