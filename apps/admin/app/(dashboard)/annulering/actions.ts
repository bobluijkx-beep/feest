"use server";

import { revalidatePath } from "next/cache";
import {
  prisma,
  cancelEvent,
  finalizeNonResponders,
  retryFailedNotices,
  createTestBuyer,
  deleteTestBuyers,
  hasEventAccess,
  logAudit,
} from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

/** Gemeenschappelijke guard: ingelogd als ADMIN/FINANCE én toegang tot het event van déze
 * organisatie. Geeft null terug bij elke afwijking — de acties doen dan gewoon niets. */
async function authorize(formData: FormData) {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return null;
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event || !(await hasEventAccess(actor, eventId))) return null;
  return { actor, event };
}

export async function startCancellation(formData: FormData): Promise<void> {
  const auth = await authorize(formData);
  if (!auth) return;

  const { notices } = await cancelEvent(auth.event.id);

  await logAudit({
    organizationId: auth.actor.organizationId,
    actorUserId: auth.actor.id,
    action: "event_cancelled",
    entityType: "event",
    entityId: auth.event.id,
    metadata: { notices },
  });
  revalidatePath("/annulering");
}

export async function finalizeNonRespondersAction(formData: FormData): Promise<void> {
  const auth = await authorize(formData);
  if (!auth) return;

  const { refunded } = await finalizeNonResponders(auth.event.id);

  await logAudit({
    organizationId: auth.actor.organizationId,
    actorUserId: auth.actor.id,
    action: "cancellation_non_responders_refunded",
    entityType: "event",
    entityId: auth.event.id,
    metadata: { refunded },
  });
  revalidatePath("/annulering");
}

export async function retryFailedRefundsAction(formData: FormData): Promise<void> {
  const auth = await authorize(formData);
  if (!auth) return;

  const { attempted } = await retryFailedNotices(auth.event.id);

  await logAudit({
    organizationId: auth.actor.organizationId,
    actorUserId: auth.actor.id,
    action: "cancellation_refunds_retried",
    entityType: "event",
    entityId: auth.event.id,
    metadata: { attempted },
  });
  revalidatePath("/annulering");
}

export interface TestBuyerState {
  error?: string;
  success?: boolean;
}

/** Testkoper toevoegen om de workflow zonder Mollie te proberen (zie createTestBuyer). */
export async function addTestBuyerAction(_prev: TestBuyerState, formData: FormData): Promise<TestBuyerState> {
  const auth = await authorize(formData);
  if (!auth) return { error: "Geen toegang tot dit evenement." };

  const donationEuros = Number(String(formData.get("donationEuros") ?? "0").replace(",", ".") || 0);
  const result = await createTestBuyer({
    eventId: auth.event.id,
    buyerName: String(formData.get("buyerName") ?? ""),
    buyerEmail: String(formData.get("buyerEmail") ?? ""),
    productId: String(formData.get("productId") ?? ""),
    quantity: Number(formData.get("quantity") ?? 1),
    donationCents: Number.isFinite(donationEuros) ? Math.round(donationEuros * 100) : NaN,
  });
  if (!result.ok) return { error: result.error };

  await logAudit({
    organizationId: auth.actor.organizationId,
    actorUserId: auth.actor.id,
    action: "cancellation_test_buyer_added",
    entityType: "event",
    entityId: auth.event.id,
    metadata: { buyerEmail: String(formData.get("buyerEmail") ?? "") },
  });
  revalidatePath("/annulering");
  return { success: true };
}

export async function removeTestBuyersAction(formData: FormData): Promise<void> {
  const auth = await authorize(formData);
  if (!auth) return;

  const { orders } = await deleteTestBuyers(auth.event.id);

  await logAudit({
    organizationId: auth.actor.organizationId,
    actorUserId: auth.actor.id,
    action: "cancellation_test_buyers_removed",
    entityType: "event",
    entityId: auth.event.id,
    metadata: { orders },
  });
  revalidatePath("/annulering");
}

/** Uiterste reactiedatum (alleen informatief, zie Event.cancellationDeadline). Leeg = wissen.
 * Als kalenderdatum opgeslagen op 12:00 UTC zodat de dag in Nederland altijd klopt. */
export async function setCancellationDeadlineAction(formData: FormData): Promise<void> {
  const auth = await authorize(formData);
  if (!auth) return;

  const raw = String(formData.get("deadline") ?? "");
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00Z`) : null;
  await prisma.event.update({ where: { id: auth.event.id }, data: { cancellationDeadline: deadline } });

  await logAudit({
    organizationId: auth.actor.organizationId,
    actorUserId: auth.actor.id,
    action: "cancellation_deadline_set",
    entityType: "event",
    entityId: auth.event.id,
    metadata: { deadline: deadline?.toISOString() ?? null },
  });
  revalidatePath("/annulering");
}
