"use server";

import { redirect } from "next/navigation";
import { createBulkCampaign, buildSegmentRecipients, buildAdHocRecipients, hasEventAccess } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { parseSegmentFromFormData } from "./segment-form";

export interface CreateCampaignState {
  error?: string;
}

export async function createCampaign(_prevState: CreateCampaignState, formData: FormData): Promise<CreateCampaignState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const segment = parseSegmentFromFormData(formData);
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("bodyHtml") ?? "");
  const layoutId = String(formData.get("layoutId") ?? "") || null;

  if (!segment.eventId) return { error: "Kies een event." };
  if (!subject) return { error: "Vul een onderwerp in." };
  if (!bodyHtml.trim()) return { error: "Vul een inhoud in." };
  if (!(await hasEventAccess(actor, segment.eventId))) {
    return { error: "Je hebt geen toegang tot dit event." };
  }

  // De doelgroep-filters (segment) bepalen de kandidatenlijst; welke daarvan echt een mail
  // krijgen, bepaalt de admin zelf via de aangevinkte selectie in CampaignComposeForm — zo
  // kan bv. voor een test alleen het eigen adres aangevinkt blijven. extraEmails staat daar
  // los van (bv. een testadres dat geen bestelling/adresboek-contact heeft).
  const candidates = await buildSegmentRecipients(segment);
  const selectedEmails = new Set(formData.getAll("selectedEmails").map((v) => String(v).toLowerCase()));
  const selected = candidates.filter((r) => selectedEmails.has(r.email.toLowerCase()));

  const extraRaw = String(formData.get("extraEmails") ?? "");
  const alreadyIncluded = new Set(selected.map((r) => r.email.toLowerCase()));
  const extras = (await buildAdHocRecipients(segment.eventId, extraRaw)).filter(
    (r) => !alreadyIncluded.has(r.email.toLowerCase()),
  );

  const recipients = [...selected, ...extras];
  if (recipients.length === 0) return { error: "Kies minstens één ontvanger." };

  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
  const campaign = await createBulkCampaign({
    actor,
    eventId: segment.eventId,
    segment,
    recipients,
    subject,
    bodyHtml,
    layoutId,
    callbackUrl: `${baseUrl}/api/qstash/send-bulk-batch`,
  });

  redirect(`/mailings/${campaign.id}`);
}
