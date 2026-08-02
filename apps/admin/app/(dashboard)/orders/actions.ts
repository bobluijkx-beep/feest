"use server";

import { revalidatePath } from "next/cache";
import { prisma, refundOrder as refundOrderCore, deleteTestOrder, logAudit } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

export interface OrderActionState {
  error?: string;
  success?: boolean;
}

export async function refundOrder(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Ontbrekend orderId." };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Bestelling niet gevonden." };

  const result = await refundOrderCore(orderId);
  if (!result.ok) return { error: result.error };

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "order_refunded",
    entityType: "order",
    entityId: orderId,
    metadata: { buyerEmail: order.buyerEmail, totalCents: order.totalCents },
  });

  revalidatePath("/orders");
  return { success: true };
}

export async function deleteOrder(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const actor = await requireStaffRole(["ADMIN"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Ontbrekend orderId." };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Bestelling niet gevonden." };

  const result = await deleteTestOrder(orderId);
  if (!result.ok) return { error: result.error };

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "test_order_deleted",
    entityType: "order",
    entityId: orderId,
    metadata: { buyerEmail: order.buyerEmail, previousStatus: order.status, totalCents: order.totalCents },
  });

  revalidatePath("/orders");
  return { success: true };
}
