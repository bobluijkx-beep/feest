"use server";

import { revalidatePath } from "next/cache";
import {
  prisma,
  refundOrder as refundOrderCore,
  cancelOrder as cancelOrderCore,
  deleteTestOrder,
  sendOrderConfirmationEmail,
  sendPaymentFailedEmail,
  sendCancelledEmail,
  logAudit,
} from "@lions/core";
import type { EmailTemplateType } from "@lions/db";
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

/** "Op inactief zetten" in de admin: geen terugbetaling (dat blijft de aparte
 * Terugbetalen-actie, alleen voor PAID + stuurt echt geld terug via Mollie) — dit
 * annuleert de order/tickets en geeft voorraad vrij, zonder externe call. Werkt op
 * zowel PENDING als PAID (cancelOrder in packages/core regelt het verschil). */
export async function cancelOrder(_prevState: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Ontbrekend orderId." };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Bestelling niet gevonden." };

  const result = await cancelOrderCore(orderId);
  if (!result.ok) return { error: result.error };

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "order_cancelled",
    entityType: "order",
    entityId: orderId,
    metadata: { buyerEmail: order.buyerEmail, previousStatus: order.status },
  });

  revalidatePath("/orders");
  return { success: true };
}

const SENDABLE_TYPES: EmailTemplateType[] = ["ORDER_CONFIRMATION", "PAYMENT_FAILED", "CANCELLED"];

/** Eén actie voor alle (opnieuw) te versturen e-mails per order — inclusief een resend
 * van de orderbevestiging (en dus de ticket-PDF's) als die de eerste keer niet aankwam. */
export async function sendOrderEmail(_prevState: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const orderId = String(formData.get("orderId") ?? "");
  const type = String(formData.get("emailType") ?? "") as EmailTemplateType;
  if (!orderId) return { error: "Ontbrekend orderId." };
  if (!SENDABLE_TYPES.includes(type)) return { error: "Ongeldig e-mailtype." };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Bestelling niet gevonden." };

  try {
    if (type === "ORDER_CONFIRMATION") await sendOrderConfirmationEmail(orderId);
    else if (type === "PAYMENT_FAILED") await sendPaymentFailedEmail(orderId);
    else await sendCancelledEmail(orderId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Versturen mislukt." };
  }

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "order_email_resent",
    entityType: "order",
    entityId: orderId,
    metadata: { buyerEmail: order.buyerEmail, type },
  });

  return { success: true };
}

export interface OrderDetail {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  molliePaymentId: string | null;
  buyerName: string;
  buyerEmail: string;
  createdAt: string;
  updatedAt: string;
  event: { id: string; name: string; venue: string | null; startsAt: string };
  items: { id: string; productName: string; kind: string; quantity: number; unitPriceCents: number }[];
  tickets: { id: string; qrToken: string; status: string; checkedInAt: string | null }[];
  otherOrders: {
    id: string;
    status: string;
    totalCents: number;
    createdAt: string;
    eventName: string;
    items: { productName: string; quantity: number }[];
  }[];
}

/** Gewone (geen useActionState-)server action: rechtstreeks aangeroepen vanuit de
 * detail-dialog zodra die opengaat, i.p.v. alle orderdetails + koophistorie al voor elke
 * rij in de lijst op te halen. */
export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  await requireStaffRole(["ADMIN", "FINANCE"]);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      event: true,
      items: { include: { product: true } },
      tickets: { include: { checkIns: true } },
    },
  });
  if (!order) return null;

  const otherOrdersRaw = await prisma.order.findMany({
    where: { buyerEmail: order.buyerEmail, id: { not: orderId } },
    include: { event: true, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    currency: order.currency,
    molliePaymentId: order.molliePaymentId,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    event: {
      id: order.event.id,
      name: order.event.name,
      venue: order.event.venue,
      startsAt: order.event.startsAt.toISOString(),
    },
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.product.name,
      kind: item.product.kind,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
    tickets: order.tickets.map((ticket) => ({
      id: ticket.id,
      qrToken: ticket.qrToken,
      status: ticket.status,
      checkedInAt: ticket.checkIns[0]?.scannedAt.toISOString() ?? null,
    })),
    otherOrders: otherOrdersRaw.map((o) => ({
      id: o.id,
      status: o.status,
      totalCents: o.totalCents,
      createdAt: o.createdAt.toISOString(),
      eventName: o.event.name,
      items: o.items.map((item) => ({ productName: item.product.name, quantity: item.quantity })),
    })),
  };
}
