"use server";

import { revalidatePath } from "next/cache";
import { prisma, logAudit } from "@lions/core";
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

  if (!eventId || !VALID_TYPES.includes(type) || !subject || !bodyHtml) {
    return { error: "Onderwerp en inhoud zijn verplicht." };
  }

  const template = await prisma.emailTemplate.upsert({
    where: { eventId_type_language: { eventId, type, language: "nl" } },
    create: { eventId, type, language: "nl", subject, bodyHtml },
    update: { subject, bodyHtml },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "email_template_saved",
    entityType: "email_template",
    entityId: template.id,
    metadata: { type },
  });

  revalidatePath(`/content/emails/${type}`);
  return { success: true };
}
