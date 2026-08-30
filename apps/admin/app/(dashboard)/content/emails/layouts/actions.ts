"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, logAudit } from "@lions/core";
import { LAYOUT_CONTENT_PLACEHOLDER } from "@lions/core/email/layout";
import { requireStaffRole } from "@/lib/require-role";

export interface SaveLayoutState {
  error?: string;
}

export async function saveEmailLayout(_prevState: SaveLayoutState, formData: FormData): Promise<SaveLayoutState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const bodyHtml = String(formData.get("bodyHtml") ?? "");
  const isDefault = formData.get("isDefault") === "true";

  if (!name) return { error: "Vul een naam in." };
  if (!bodyHtml.includes(LAYOUT_CONTENT_PLACEHOLDER)) {
    return { error: `De lay-out moet precies één keer ${LAYOUT_CONTENT_PLACEHOLDER} bevatten — daar komt de eigenlijke e-mailinhoud.` };
  }

  // Als deze lay-out de standaard wordt, is hij dat exclusief — de vorige standaard
  // (indien anders dan deze) wordt in dezelfde transactie teruggezet.
  let layout;
  try {
    layout = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.emailLayout.updateMany({
          where: { organizationId: actor.organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      if (id) {
        const existing = await tx.emailLayout.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== actor.organizationId) {
          throw new Error("Lay-out niet gevonden.");
        }
        return tx.emailLayout.update({ where: { id }, data: { name, bodyHtml, isDefault } });
      }

      return tx.emailLayout.create({
        data: { organizationId: actor.organizationId, name, bodyHtml, isDefault },
      });
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Opslaan mislukt." };
  }

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: id ? "email_layout_updated" : "email_layout_created",
    entityType: "email_layout",
    entityId: layout.id,
    metadata: { name, isDefault },
  });

  revalidatePath("/content/emails/layouts");
  redirect(`/content/emails/layouts/${layout.id}`);
}
