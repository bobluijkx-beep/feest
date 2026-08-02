"use server";

import { revalidatePath } from "next/cache";
import { prisma, logAudit } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

export interface TicketTypeActionState {
  error?: string;
  success?: boolean;
}

function parsePriceCents(raw: FormDataEntryValue | null): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export async function createTicketType(
  _prevState: TicketTypeActionState,
  formData: FormData,
): Promise<TicketTypeActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceCents = parsePriceCents(formData.get("priceEuros"));
  const totalStock = Number(formData.get("totalStock"));

  if (!name) return { error: "Vul een naam in." };
  if (priceCents === null) return { error: "Vul een geldige prijs in (groter dan 0)." };
  if (!Number.isInteger(totalStock) || totalStock < 0) return { error: "Vul een geldig aantal in (0 of hoger)." };

  const event = await prisma.event.findFirstOrThrow({ where: { organizationId: actor.organizationId } });

  const created = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name,
      description: description || null,
      priceCents,
      totalStock,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "ticket_type_created",
    entityType: "ticket_type",
    entityId: created.id,
    metadata: { name, priceCents, totalStock },
  });

  revalidatePath("/ticket-types");
  return { success: true };
}

export async function updateTicketType(
  _prevState: TicketTypeActionState,
  formData: FormData,
): Promise<TicketTypeActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceCents = parsePriceCents(formData.get("priceEuros"));
  const totalStock = Number(formData.get("totalStock"));
  const isActive = formData.get("isActive") === "on";

  if (!id) return { error: "Ontbrekend id." };
  if (!name) return { error: "Vul een naam in." };
  if (priceCents === null) return { error: "Vul een geldige prijs in (groter dan 0)." };
  if (!Number.isInteger(totalStock) || totalStock < 0) return { error: "Vul een geldig aantal in (0 of hoger)." };

  const existing = await prisma.ticketType.findUnique({ where: { id } });
  if (!existing) return { error: "Ticketsoort niet gevonden." };

  const committed = existing.reservedStock + existing.soldStock;
  if (totalStock < committed) {
    return { error: `Aantal kan niet lager dan ${committed} (al gereserveerd/verkocht).` };
  }

  await prisma.ticketType.update({
    where: { id },
    data: { name, description: description || null, priceCents, totalStock, isActive },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "ticket_type_updated",
    entityType: "ticket_type",
    entityId: id,
    metadata: { name, priceCents, totalStock, isActive },
  });

  revalidatePath("/ticket-types");
  return { success: true };
}

export async function deleteTicketType(
  _prevState: TicketTypeActionState,
  formData: FormData,
): Promise<TicketTypeActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Ontbrekend id." };

  const orderItemCount = await prisma.orderItem.count({ where: { ticketTypeId: id } });
  if (orderItemCount > 0) {
    return { error: "Deze ticketsoort is al gebruikt in bestellingen — deactiveer 'm in plaats van verwijderen." };
  }

  await prisma.ticketType.delete({ where: { id } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "ticket_type_deleted",
    entityType: "ticket_type",
    entityId: id,
  });

  revalidatePath("/ticket-types");
  return { success: true };
}
