"use server";

import { redirect } from "next/navigation";
import { createBulkCampaign, hasEventAccess } from "@lions/core";
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

  if (!segment.eventId) return { error: "Kies een event." };
  if (!subject) return { error: "Vul een onderwerp in." };
  if (!bodyHtml.trim()) return { error: "Vul een inhoud in." };
  if (!(await hasEventAccess(actor, segment.eventId))) {
    return { error: "Je hebt geen toegang tot dit event." };
  }

  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
  const campaign = await createBulkCampaign({
    actor,
    eventId: segment.eventId,
    segment,
    subject,
    bodyHtml,
    callbackUrl: `${baseUrl}/api/qstash/send-bulk-batch`,
  });

  redirect(`/mailings/${campaign.id}`);
}
