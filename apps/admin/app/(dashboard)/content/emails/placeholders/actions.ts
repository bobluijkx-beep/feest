"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, logAudit, RESERVED_PLACEHOLDER_KEYS, PLACEHOLDER_KEY_PATTERN } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

export interface SavePlaceholderState {
  error?: string;
  success?: boolean;
}

/** Aanmaken/bewerken van een CustomPlaceholder — org-brede, door het bestuur zelf
 * onderhouden {{placeholder}}'s (bv. {{clubadres}}), zie packages/core/src/email/
 * custom-placeholders.ts. De sleutel wordt gevalideerd tegen zowel het patroon dat
 * template-engine.ts substitueert als de lijst systeem-placeholders, zodat een
 * bestuurslid nooit per ongeluk bv. {{voornaam}} overschrijft. */
export async function saveCustomPlaceholder(
  _prevState: SavePlaceholderState,
  formData: FormData,
): Promise<SavePlaceholderState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const id = String(formData.get("id") ?? "") || null;
  const key = String(formData.get("key") ?? "").trim();
  const valueHtml = String(formData.get("valueHtml") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!key) return { error: "Vul een sleutel in." };
  if (!PLACEHOLDER_KEY_PATTERN.test(key)) {
    return { error: "Een sleutel mag alleen letters, cijfers en underscores bevatten (geen accolades of spaties)." };
  }
  if (RESERVED_PLACEHOLDER_KEYS.has(key)) {
    return { error: `{{${key}}} is al een systeem-placeholder en kan niet overschreven worden.` };
  }
  if (!valueHtml.trim()) return { error: "Vul een waarde in." };

  let placeholder;
  try {
    if (id) {
      const existing = await prisma.customPlaceholder.findUnique({ where: { id } });
      if (!existing || existing.organizationId !== actor.organizationId) {
        return { error: "Placeholder niet gevonden." };
      }
      placeholder = await prisma.customPlaceholder.update({
        where: { id },
        data: { key, valueHtml, description: description || null },
      });
    } else {
      placeholder = await prisma.customPlaceholder.create({
        data: { organizationId: actor.organizationId, key, valueHtml, description: description || null },
      });
    }
  } catch (err) {
    // Unieke-constraint (organizationId, key) — nette foutmelding i.p.v. de ruwe Prisma-tekst.
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Unique constraint")) {
      return { error: `Er bestaat al een placeholder met de sleutel {{${key}}}.` };
    }
    return { error: "Opslaan mislukt." };
  }

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: id ? "custom_placeholder_updated" : "custom_placeholder_created",
    entityType: "custom_placeholder",
    entityId: placeholder.id,
    metadata: { key },
  });

  revalidatePath("/content/emails/placeholders");
  redirect("/content/emails/placeholders");
}

export async function deleteCustomPlaceholder(
  _prevState: SavePlaceholderState,
  formData: FormData,
): Promise<SavePlaceholderState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Ontbrekend id." };

  const existing = await prisma.customPlaceholder.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== actor.organizationId) {
    return { error: "Placeholder niet gevonden." };
  }

  await prisma.customPlaceholder.delete({ where: { id } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "custom_placeholder_deleted",
    entityType: "custom_placeholder",
    entityId: id,
    metadata: { key: existing.key },
  });

  revalidatePath("/content/emails/placeholders");
  return { success: true };
}
