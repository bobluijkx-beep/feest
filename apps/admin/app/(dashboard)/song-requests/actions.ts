"use server";

import { revalidatePath } from "next/cache";
import { bulkSetSongRequestsVisible as bulkSetVisibleCore, bulkDeleteSongRequests as bulkDeleteCore, logAudit } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

export interface BulkActionResult {
  error?: string;
}

/** Zelfde "op inactief zetten i.p.v. direct verwijderen"-patroon als bulkSetOrdersVisible
 * (apps/admin/app/(dashboard)/orders/actions.ts) — hier per ranglijst-groep (alle
 * onderliggende SongRequest-rij-id's van één geselecteerde regel, zie
 * getRankedSongRequests). */
export async function bulkSetSongRequestsVisible(ids: string[], isVisible: boolean): Promise<BulkActionResult> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  if (ids.length === 0) return {};

  await bulkSetVisibleCore(ids, isVisible);
  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: isVisible ? "song_requests_reactivated" : "song_requests_deactivated",
    entityType: "song_request",
    entityId: ids[0],
    metadata: { ids, bulk: true },
  });

  revalidatePath("/song-requests");
  revalidatePath("/song-requests/inactief");
  return {};
}

/** Bulk-verwijderen — alleen ADMIN, zelfde beperking als bulkDeleteOrders. Serverside wordt
 * niet nogmaals gecontroleerd of de rijen wel al inactief zijn (in tegenstelling tot
 * bulkDeleteOrders): song-verzoeken hebben geen aparte "status" die dat kan tegenspreken, en
 * de knop staat toch alleen op de Inactief-pagina. */
export async function bulkDeleteSongRequests(ids: string[]): Promise<BulkActionResult> {
  const actor = await requireStaffRole(["ADMIN"]);
  if (ids.length === 0) return {};

  await bulkDeleteCore(ids);
  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "song_requests_deleted",
    entityType: "song_request",
    entityId: ids[0],
    metadata: { ids, bulk: true },
  });

  revalidatePath("/song-requests/inactief");
  return {};
}
