"use server";

import { revalidatePath } from "next/cache";
import { prisma, logAudit, uploadEmailAsset } from "@lions/core";
import type { EmailTemplateType } from "@lions/db";
import { requireStaffRole } from "@/lib/require-role";

export interface SaveTemplateState {
  error?: string;
  success?: boolean;
}

const VALID_TYPES: EmailTemplateType[] = ["ORDER_CONFIRMATION", "PAYMENT_FAILED", "PAYMENT_REMINDER", "CANCELLED"];

export async function saveEmailTemplate(
  _prevState: SaveTemplateState,
  formData: FormData,
): Promise<SaveTemplateState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const eventId = String(formData.get("eventId") ?? "");
  const type = String(formData.get("type") ?? "") as EmailTemplateType;
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("bodyHtml") ?? "").trim();
  const layoutIdRaw = String(formData.get("layoutId") ?? "");
  const layoutId = layoutIdRaw || null;

  if (!eventId || !VALID_TYPES.includes(type) || !subject || !bodyHtml) {
    return { error: "Onderwerp en inhoud zijn verplicht." };
  }
  if (layoutId && !(await prisma.emailLayout.findUnique({ where: { id: layoutId } }))) {
    return { error: "Ongeldige lay-out." };
  }

  const template = await prisma.emailTemplate.upsert({
    where: { eventId_type_language: { eventId, type, language: "nl" } },
    create: { eventId, type, language: "nl", subject, bodyHtml, layoutId },
    update: { subject, bodyHtml, layoutId },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "email_template_saved",
    entityType: "email_template",
    entityId: template.id,
    metadata: { type, layoutId },
  });

  revalidatePath(`/content/emails/${type}`);
  return { success: true };
}

export interface UploadImageResult {
  url?: string;
  error?: string;
}

/** Gebruikt door de HtmlEditor-werkbalk (zowel voor e-mailtemplates, mailings als
 * lay-outs — allemaal onder /content/emails-achtige of /mailings-schermen, vandaar hier
 * gecentraliseerd i.p.v. drie keer dezelfde actie). */
export async function uploadEmailImage(formData: FormData): Promise<UploadImageResult> {
  await requireStaffRole(["ADMIN", "EDITOR"]);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Kies eerst een bestand." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Alleen afbeeldingen zijn toegestaan." };
  }

  try {
    const url = await uploadEmailAsset(file);
    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Uploaden mislukt." };
  }
}
