"use server";

import { revalidatePath } from "next/cache";
import {
  prisma,
  cancelEvent,
  finalizeNonResponders,
  retryFailedNotices,
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
