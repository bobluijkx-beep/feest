"use server";

import { revalidatePath } from "next/cache";
import {
  prisma,
  refundOrder as refundOrderCore,
  setOrderVisibility,
  setOrderStatus as setOrderStatusCore,
  setTicketCheckedIn,
  deleteTestOrder,
  sendOrderConfirmationEmail,
  sendPaymentFailedEmail,
  sendCancelledEmail,
  logAudit,
} from "@lions/core";
import type { EmailTemplateType, OrderStatus } from "@lions/db";
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

/** Permanent verwijderen kan uitsluitend vanuit de "Inactief"-afdeling: een order moet
 * eerst op inactief gezet zijn (isVisible: false) voordat hij weggegooid mag worden. Dit
 * is een echte serverside-check, niet alleen een UI-restrictie (de knop staat sowieso
 * alleen op /orders/inactief). */
export async function deleteOrder(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const actor = await requireStaffRole(["ADMIN"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Ontbrekend orderId." };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Bestelling niet gevonden." };
  if (order.isVisible) {
    return { error: "Alleen inactieve bestellingen kunnen verwijderd worden. Zet de bestelling eerst op inactief." };
  }

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
  revalidatePath("/orders/inactief");
  return { success: true };
}

/** "Op inactief zetten"/"Weer actief maken": een pure zichtbaarheids-toggle
 * (`Order.isVisible`) die de regel uit het standaardoverzicht haalt — géén statuswijziging,
 * geen effect op tickets/voorraad. Een echte annulering/terugbetaling loopt via de aparte
 * Terugbetalen-actie; permanent verwijderen kan pas daarna, vanuit /orders/inactief. */
export async function setOrderVisible(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const orderId = String(formData.get("orderId") ?? "");
  const isVisible = String(formData.get("isVisible") ?? "") === "true";
  if (!orderId) return { error: "Ontbrekend orderId." };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Bestelling niet gevonden." };

  const result = await setOrderVisibility(orderId, isVisible);
  if (!result.ok) return { error: result.error };

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: isVisible ? "order_reactivated" : "order_deactivated",
    entityType: "order",
    entityId: orderId,
    metadata: { buyerEmail: order.buyerEmail },
  });

  revalidatePath("/orders");
  revalidatePath("/orders/inactief");
  return { success: true };
}

/** Verwijdert een e-mailadres uit EmailOptOut ("weer aanmelden voor mailings") — het
 * tegenovergestelde gebeurt al vanzelf zodra iemand opnieuw afmeldt (via de afmeldlink of
 * de opt-in-checkbox bij het afrekenen), dus hier alleen deze ene richting: het bestuur
 * kan een afmelding ongedaan maken, bv. na telefonisch contact met de koper. Case-
 * insensitive (mode: "insensitive") i.p.v. een exacte match, om dezelfde reden als de
 * rood/groen-bolletjes elders in dit bestand/orders/page.tsx: het e-mailadres kan met een
 * andere hoofdlettering zijn opgeslagen dan op de bestelling zelf staat. deleteMany i.p.v.
 * delete: verwijdert dan in één keer ook een eventuele dubbele rij met afwijkende
 * hoofdlettering, en faalt niet als er (door een race condition) toevallig al geen rij
 * meer bestaat. */
export async function reactivateEmailSubscription(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Ontbrekend e-mailadres." };

  await prisma.emailOptOut.deleteMany({ where: { email: { equals: email, mode: "insensitive" } } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "email_optout_cleared",
    entityType: "email_opt_out",
    entityId: email,
  });

  revalidatePath("/orders");
  revalidatePath("/orders/inactief");
  return { success: true };
}

export interface BulkActionResult {
  error?: string;
}

/** Bulk-variant van setOrderVisible: rechtstreeks vanuit een client component aangeroepen
 * (niet via useActionState/FormData, want die krijgt hier een array van id's mee) door de
 * selectievakjes-werkbalk op /orders en /orders/inactief. Loopt gewoon over de bestaande,
 * al geteste setOrderVisibility per order i.p.v. een aparte bulk-SQL-query — bij dit
 * schaalniveau (max 100 rijen per pagina) weegt hergebruik van de geteste single-item-
 * logica zwaarder dan de iets hogere queryload. */
export async function bulkSetOrdersVisible(orderIds: string[], isVisible: boolean): Promise<BulkActionResult> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  if (orderIds.length === 0) return {};

  const orders = await prisma.order.findMany({ where: { id: { in: orderIds } } });
  let failed = 0;
  for (const order of orders) {
    const result = await setOrderVisibility(order.id, isVisible);
    if (result.ok) {
      await logAudit({
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        action: isVisible ? "order_reactivated" : "order_deactivated",
        entityType: "order",
        entityId: order.id,
        metadata: { buyerEmail: order.buyerEmail, bulk: true },
      });
    } else {
      failed++;
    }
  }

  revalidatePath("/orders");
  revalidatePath("/orders/inactief");
  return failed > 0 ? { error: `${failed} van ${orders.length} bestellingen konden niet bijgewerkt worden.` } : {};
}

/** Bulk-variant van deleteOrder — zelfde harde regel als de losse actie: alleen inactieve
 * bestellingen mogen weg, serverside gecontroleerd (niet alleen omdat de knop toevallig
 * alleen op /orders/inactief staat). */
export async function bulkDeleteOrders(orderIds: string[]): Promise<BulkActionResult> {
  const actor = await requireStaffRole(["ADMIN"]);
  if (orderIds.length === 0) return {};

  const orders = await prisma.order.findMany({ where: { id: { in: orderIds } } });
  const errors: string[] = [];
  for (const order of orders) {
    if (order.isVisible) {
      errors.push(`${order.buyerName}: alleen inactieve bestellingen kunnen verwijderd worden.`);
      continue;
    }
    const result = await deleteTestOrder(order.id);
    if (result.ok) {
      await logAudit({
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        action: "test_order_deleted",
        entityType: "order",
        entityId: order.id,
        metadata: { buyerEmail: order.buyerEmail, previousStatus: order.status, totalCents: order.totalCents, bulk: true },
      });
    } else {
      errors.push(`${order.buyerName}: ${result.error}`);
    }
  }

  revalidatePath("/orders");
  revalidatePath("/orders/inactief");
  return errors.length > 0 ? { error: errors.slice(0, 3).join(" ") } : {};
}

const SETTABLE_STATUSES: OrderStatus[] = ["PENDING", "PAID", "EXPIRED", "FAILED", "CANCELLED", "REFUNDED"];

/** Handmatige statuscorrectie — bv. een betaling die buiten Mollie om alsnog is
 * ontvangen, of een status die verkeerd staat. setOrderStatusCore past voorraad en
 * tickets automatisch aan op basis van de statusovergang (zie set-order-status.ts);
 * stuurt geen e-mail en doet geen Mollie-call (dat blijven de aparte Terugbetalen-/
 * e-mailacties). */
export async function setOrderStatus(_prevState: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!orderId) return { error: "Ontbrekend orderId." };
  if (!SETTABLE_STATUSES.includes(status)) return { error: "Ongeldige status." };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Bestelling niet gevonden." };

  const result = await setOrderStatusCore(orderId, status);
  if (!result.ok) return { error: result.error };

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "order_status_changed",
    entityType: "order",
    entityId: orderId,
    metadata: { buyerEmail: order.buyerEmail, previousStatus: order.status, newStatus: status },
  });

  revalidatePath("/orders");
  revalidatePath("/orders/inactief");
  return { success: true };
}

/** Handmatige incheckcorrectie per ticket — zie setTicketCheckedIn (packages/core) voor
 * de precieze regels (o.a. een geannuleerd ticket kan niet ingecheckt worden). */
export async function setTicketCheckIn(_prevState: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const ticketId = String(formData.get("ticketId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const checkedIn = String(formData.get("checkedIn") ?? "") === "true";
  if (!ticketId || !orderId) return { error: "Ontbrekend ticketId/orderId." };

  const result = await setTicketCheckedIn(ticketId, checkedIn, actor.email);
  if (!result.ok) return { error: result.error };

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: checkedIn ? "ticket_checked_in_manually" : "ticket_check_in_undone",
    entityType: "ticket",
    entityId: ticketId,
    metadata: { orderId },
  });

  revalidatePath("/orders");
  revalidatePath("/orders/inactief");
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
  isVisible: boolean;
  totalCents: number;
  currency: string;
  molliePaymentId: string | null;
  buyerName: string;
  buyerEmail: string;
  emailOptedOut: boolean;
  createdAt: string;
  updatedAt: string;
  event: { id: string; name: string; venue: string | null; startsAt: string };
  items: {
    id: string;
    productName: string;
    kind: string;
    quantity: number;
    unitPriceCents: number;
    // Gezet als deze regel uit een combi-aankoop is geëxplodeerd (create-order.ts) — puur
    // voor weergave ("1x Glowstick (uit combi: Ticket + Glowstick)").
    bundleName: string | null;
  }[];
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
      items: { include: { product: true, bundle: true } },
      tickets: { include: { checkIns: true } },
    },
  });
  if (!order) return null;

  const [otherOrdersRaw, optOut] = await Promise.all([
    prisma.order.findMany({
      where: { buyerEmail: order.buyerEmail, id: { not: orderId } },
      include: { event: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // mode: "insensitive" i.p.v. de lowercase-Set-aanpak van de lijstpagina's/segment.ts:
    // hier gaat het om precies één e-mailadres, dus is een directe case-insensitive query
    // simpeler dan eerst de hele EmailOptOut-tabel op te halen.
    prisma.emailOptOut.findFirst({ where: { email: { equals: order.buyerEmail, mode: "insensitive" } } }),
  ]);

  return {
    id: order.id,
    status: order.status,
    isVisible: order.isVisible,
    totalCents: order.totalCents,
    currency: order.currency,
    molliePaymentId: order.molliePaymentId,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    emailOptedOut: optOut !== null,
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
      bundleName: item.bundle?.name ?? null,
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
