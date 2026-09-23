"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  prisma,
  createBulkCampaign,
  buildSegmentRecipients,
  buildAdHocRecipients,
  hasEventAccess,
  logAudit,
} from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { parseSegmentFromFormData } from "./segment-form";

export interface CreateCampaignState {
  error?: string;
}

export async function createCampaign(_prevState: CreateCampaignState, formData: FormData): Promise<CreateCampaignState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const segment = parseSegmentFromFormData(formData);
  const templateId = String(formData.get("templateId") ?? "");

  if (!segment.eventId) return { error: "Kies een event." };
  if (!templateId) return { error: "Kies een mailing-template." };
  if (!(await hasEventAccess(actor, segment.eventId))) {
    return { error: "Je hebt geen toegang tot dit event." };
  }

  // Onderwerp/inhoud/lay-out komen altijd van de template zelf, nooit van de client — een
  // template kiezen betekent letterlijk "verstuur precies wat daar staat", zie ook het
  // ontkoppelen van opstellen en versturen dat hiervoor werd gevraagd.
  const template = await prisma.mailingTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.organizationId !== actor.organizationId) {
    return { error: "Template niet gevonden." };
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
    mailingTemplateId: template.id,
    subject: template.subject,
    bodyHtml: template.bodyHtml,
    layoutId: template.layoutId,
    callbackUrl: `${baseUrl}/api/qstash/send-bulk-batch`,
  });

  redirect(`/mailings/${campaign.id}`);
}

/** Verwijdert een campagne uit de geschiedenis (bv. een testverzending of vergissing) —
 * verandert niets aan al verstuurde e-mails, ruimt alleen de rij en zijn recipients op.
 * recipients hebben geen ON DELETE CASCADE naar de campagne, dus eerst die weg (zelfde
 * patroon als deleteTestOrder in packages/core voor songRequests/tickets/orderItems). */
export async function deleteCampaign(formData: FormData): Promise<void> {
  const actor = await requireStaffRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");

  const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!campaign || campaign.organizationId !== actor.organizationId) return;

  await prisma.$transaction([
    prisma.emailCampaignRecipient.deleteMany({ where: { campaignId: id } }),
    prisma.emailCampaign.delete({ where: { id } }),
  ]);

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "mailing_campaign_deleted",
    entityType: "email_campaign",
    entityId: id,
    metadata: { subject: campaign.subject, status: campaign.status },
  });

  revalidatePath("/mailings");
}
