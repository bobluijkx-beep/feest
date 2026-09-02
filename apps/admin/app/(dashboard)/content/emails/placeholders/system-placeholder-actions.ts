"use server";

import { revalidatePath } from "next/cache";
import { prisma, logAudit, SYSTEM_PLACEHOLDER_DEFS } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import type { SavePlaceholderState } from "./actions";

const VALID_KEYS = new Set(SYSTEM_PLACEHOLDER_DEFS.map((def) => def.key));

/** Slaat de aangepaste bewoording van één van de drie vaste systeem-placeholders op
 * (locatie/tickets_sectie/merchandise, zie packages/core/src/email/
 * system-placeholder-overrides.ts) — anders dan saveCustomPlaceholder in actions.ts is
 * hier geen sleutel te kiezen, alleen de tekst voor een van de drie vaste keys. */
export async function saveSystemPlaceholderTemplate(
  _prevState: SavePlaceholderState,
  formData: FormData,
): Promise<SavePlaceholderState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const key = String(formData.get("key") ?? "");
  const template = String(formData.get("template") ?? "");

  if (!VALID_KEYS.has(key as never)) return { error: "Ongeldige placeholder." };
  if (!template.trim()) return { error: "Vul een tekst in." };

  await prisma.systemPlaceholderOverride.upsert({
    where: { organizationId_key: { organizationId: actor.organizationId, key } },
    create: { organizationId: actor.organizationId, key, template },
    update: { template },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "system_placeholder_updated",
    entityType: "system_placeholder_override",
    entityId: key,
    metadata: { key },
  });

  revalidatePath("/content/emails/placeholders");
  return { success: true };
}

export async function resetSystemPlaceholderTemplate(
  _prevState: SavePlaceholderState,
  formData: FormData,
): Promise<SavePlaceholderState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const key = String(formData.get("key") ?? "");
  if (!VALID_KEYS.has(key as never)) return { error: "Ongeldige placeholder." };

  await prisma.systemPlaceholderOverride.deleteMany({ where: { organizationId: actor.organizationId, key } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "system_placeholder_reset",
    entityType: "system_placeholder_override",
    entityId: key,
    metadata: { key },
  });

  revalidatePath("/content/emails/placeholders");
  return { success: true };
}
