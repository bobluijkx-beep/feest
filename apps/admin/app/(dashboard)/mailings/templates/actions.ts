"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, logAudit } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

export interface TemplateActionState {
  error?: string;
}

/** Zelfde patroon als content/pages/actions.ts: één actie voor aanmaken én bewerken, die
 * aan een meegegeven verborgen "id"-veld ziet welke van de twee het is. */
export async function saveTemplate(_prevState: TemplateActionState, formData: FormData): Promise<TemplateActionState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("bodyHtml") ?? "");
  const layoutId = String(formData.get("layoutId") ?? "") || null;

  if (!name) return { error: "Vul een naam in." };
  if (!subject) return { error: "Vul een onderwerp in." };
  if (!bodyHtml.trim()) return { error: "Vul een inhoud in." };

  if (id) {
    const existing = await prisma.mailingTemplate.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== actor.organizationId) return { error: "Template niet gevonden." };

    await prisma.mailingTemplate.update({ where: { id }, data: { name, subject, bodyHtml, layoutId } });
    await logAudit({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: "mailing_template_updated",
      entityType: "mailing_template",
      entityId: id,
      metadata: { name },
    });
  } else {
    const created = await prisma.mailingTemplate.create({
      data: { organizationId: actor.organizationId, name, subject, bodyHtml, layoutId },
    });
    await logAudit({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: "mailing_template_created",
      entityType: "mailing_template",
      entityId: created.id,
      metadata: { name },
    });
  }

  redirect("/mailings/templates");
}

export async function duplicateTemplate(formData: FormData): Promise<void> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.mailingTemplate.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== actor.organizationId) return;

  await prisma.mailingTemplate.create({
    data: {
      organizationId: actor.organizationId,
      name: `${existing.name} (kopie)`,
      subject: existing.subject,
      bodyHtml: existing.bodyHtml,
      layoutId: existing.layoutId,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "mailing_template_duplicated",
    entityType: "mailing_template",
    entityId: id,
    metadata: { name: existing.name },
  });

  revalidatePath("/mailings/templates");
}

export async function deleteTemplate(formData: FormData): Promise<void> {
  const actor = await requireStaffRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.mailingTemplate.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== actor.organizationId) return;

  await prisma.mailingTemplate.delete({ where: { id } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "mailing_template_deleted",
    entityType: "mailing_template",
    entityId: id,
    metadata: { name: existing.name },
  });

  revalidatePath("/mailings/templates");
}
