"use server";

import { revalidatePath } from "next/cache";
import { prisma, logAudit, uploadProductImage } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

export interface BundleActionState {
  error?: string;
  success?: boolean;
}

function parsePriceCents(raw: FormDataEntryValue | null): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function getImageFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

/** Leest de dynamische component-rijen (component-picker.tsx: `componentProductId[i]` +
 * `componentQuantity[i]`, parallelle arrays via meerdere gelijknamige form-velden) — null
 * bij minder dan 1 rij, een ongeldig aantal, of een product dat twee keer gekozen is. */
function parseComponents(formData: FormData): { productId: string; quantity: number }[] | null {
  const productIds = formData.getAll("componentProductId").map(String);
  const quantities = formData.getAll("componentQuantity").map(Number);
  if (productIds.length === 0 || productIds.length !== quantities.length) return null;

  const components: { productId: string; quantity: number }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i];
    const quantity = quantities[i];
    if (!productId || !Number.isInteger(quantity) || quantity <= 0) return null;
    if (seen.has(productId)) return null;
    seen.add(productId);
    components.push({ productId, quantity });
  }
  return components;
}

export async function createBundle(_prevState: BundleActionState, formData: FormData): Promise<BundleActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!eventId) return { error: "Kies een evenement." };
  if (!name) return { error: "Vul een naam in." };

  const priceCents = parsePriceCents(formData.get("priceEuros"));
  if (priceCents === null) return { error: "Vul een geldige prijs in (groter dan 0)." };

  const components = parseComponents(formData);
  if (!components) return { error: "Kies minimaal 1 product met een geldig aantal (geen dubbele producten)." };

  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { error: "Evenement niet gevonden." };

  const products = await prisma.product.findMany({
    where: { id: { in: components.map((c) => c.productId) }, eventId },
  });
  if (products.length !== components.length) {
    return { error: "Eén of meer gekozen producten horen niet (meer) bij dit evenement." };
  }

  const created = await prisma.productBundle.create({
    data: {
      eventId,
      name,
      description: description || null,
      priceCents,
      items: { create: components.map((c) => ({ productId: c.productId, quantity: c.quantity })) },
    },
  });

  // Zelfde tweede-stap-patroon als bij een gewoon product (products/actions.ts): het pad in
  // Storage is op het (net aangemaakte) id gebaseerd.
  const image = getImageFile(formData);
  if (image) {
    const imageUrl = await uploadProductImage(created.id, image);
    await prisma.productBundle.update({ where: { id: created.id }, data: { imageUrl } });
  }

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "product_bundle_created",
    entityType: "product_bundle",
    entityId: created.id,
    metadata: { name, priceCents, eventId, components },
  });

  revalidatePath("/products/bundles");
  return { success: true };
}

export async function updateBundle(_prevState: BundleActionState, formData: FormData): Promise<BundleActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!id) return { error: "Ontbrekend id." };
  if (!name) return { error: "Vul een naam in." };

  const existing = await prisma.productBundle.findUnique({ where: { id } });
  if (!existing) return { error: "Combi niet gevonden." };

  const priceCents = parsePriceCents(formData.get("priceEuros"));
  if (priceCents === null) return { error: "Vul een geldige prijs in (groter dan 0)." };

  const components = parseComponents(formData);
  if (!components) return { error: "Kies minimaal 1 product met een geldig aantal (geen dubbele producten)." };

  const products = await prisma.product.findMany({
    where: { id: { in: components.map((c) => c.productId) }, eventId: existing.eventId },
  });
  if (products.length !== components.length) {
    return { error: "Eén of meer gekozen producten horen niet (meer) bij dit evenement." };
  }

  const image = getImageFile(formData);
  const imageUrl = image ? await uploadProductImage(id, image) : undefined;

  // Componenten simpelweg vervangen (verwijderen + opnieuw aanmaken) i.p.v. een diff uit te
  // rekenen — een combi heeft doorgaans maar een handvol regels, dus dat weegt niet op tegen
  // de complexiteit van in-place bijwerken.
  await prisma.$transaction(async (tx) => {
    await tx.productBundleItem.deleteMany({ where: { bundleId: id } });
    await tx.productBundle.update({
      where: { id },
      data: {
        name,
        description: description || null,
        priceCents,
        isActive,
        imageUrl,
        items: { create: components.map((c) => ({ productId: c.productId, quantity: c.quantity })) },
      },
    });
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "product_bundle_updated",
    entityType: "product_bundle",
    entityId: id,
    metadata: { name, priceCents, isActive, components },
  });

  revalidatePath("/products/bundles");
  return { success: true };
}

/** Zelfde "alleen inactief + niet gebruikt" regel als deleteProduct (products/actions.ts). */
export async function deleteBundle(_prevState: BundleActionState, formData: FormData): Promise<BundleActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Ontbrekend id." };

  const existing = await prisma.productBundle.findUnique({ where: { id } });
  if (!existing) return { error: "Combi niet gevonden." };
  if (existing.isActive) {
    return { error: "Alleen inactieve combi's kunnen verwijderd worden. Zet de combi eerst op inactief." };
  }

  const orderItemCount = await prisma.orderItem.count({ where: { bundleId: id } });
  if (orderItemCount > 0) {
    return { error: "Deze combi is al gebruikt in bestellingen en kan niet verwijderd worden." };
  }

  // ProductBundleItem staat op onDelete: Cascade — geen aparte deleteMany nodig.
  await prisma.productBundle.delete({ where: { id } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "product_bundle_deleted",
    entityType: "product_bundle",
    entityId: id,
  });

  revalidatePath("/products/bundles");
  return { success: true };
}
