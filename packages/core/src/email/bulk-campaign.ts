import "server-only";
import { randomUUID, randomBytes } from "node:crypto";
import { Client } from "@upstash/qstash";
import { Prisma } from "@lions/db";
import { prisma } from "../db";
import { logAudit } from "../audit/log";
import type { AppUser } from "../auth/session";
import { sendEmail } from "./resend";
import { renderWithLayout } from "./layout";
import { getEmailLayoutHtml } from "./get-layout";
import { buildUnsubscribeLinkHtml } from "./unsubscribe";
import { getWebBaseUrl } from "../utils/base-url";
import type { CampaignSegment, SegmentRecipient } from "./segment";

const BATCH_SIZE = 20;
/** Kleine buffer tussen vervolgbatches, als marge voor Resend's ratelimit. De eerste
 * batch wordt zonder delay gepland — de campagne + recipients staan dan al in de DB. */
const BATCH_DELAY = "3s";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Ontbrekende environment variable: ${name}`);
  return value;
}

/** Zelfde QStash-client-patroon als scheduleOrderExpiry
 * (packages/core/src/checkout/qstash.ts). feest-admin heeft — anders dan feest-website —
 * geen eigen domein, dus Vercel's SSO-deploymentbeveiliging ("alles behalve custom
 * domains") staat ook op de productie-URL aan en blokkeert deze callback anders met een
 * onzichtbare 401: QStash krijgt de Vercel-inlogpagina terug i.p.v. onze route, de batch
 * wordt nooit verwerkt en de campagne blijft voor altijd op QUEUED staan. De header hieronder
 * is Vercel's eigen "Protection Bypass for Automation" — leeg/ontbrekend op een project
 * zónder die bescherming (bv. feest-website) heeft geen effect. */
export async function scheduleBulkCampaignBatch(
  campaignId: string,
  callbackUrl: string,
  delay?: `${bigint}s`,
): Promise<void> {
  const client = new Client({ token: requireEnv("QSTASH_TOKEN"), baseUrl: process.env.QSTASH_URL });
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  await client.publishJSON({
    url: callbackUrl,
    body: { campaignId },
    delay,
    headers: bypassSecret ? { "x-vercel-protection-bypass": bypassSecret } : undefined,
  });
}

/** Legt de campagne + de meegegeven recipients (status PENDING) vast in één transactie, en
 * plant — pas ná het committen, om een race met een te-vroege QStash-callback te voorkomen
 * — de eerste verzendbatch. De aanroeper bepaalt de uiteindelijke ontvangerslijst (bv.
 * `buildSegmentRecipients(segment)`, eventueel door de admin handmatig versmald tot een
 * selectie + ad-hoc testadressen, zie apps/admin/(dashboard)/mailings/actions.ts) — `segment`
 * zelf wordt hier alleen nog als audit-snapshot van de gekozen filters opgeslagen. */
export async function createBulkCampaign(params: {
  actor: AppUser;
  eventId: string;
  segment: CampaignSegment;
  recipients: SegmentRecipient[];
  mailingTemplateId?: string | null;
  subject: string;
  bodyHtml: string;
  layoutId?: string | null;
  callbackUrl: string;
}): Promise<{ id: string; totalRecipients: number }> {
  const recipients = params.recipients;

  // Id + shortCode vooraf gegenereerd zodat de {{ticketlink}}-personalisatie hieronder al
  // naar de uiteindelijke campagne kan verwijzen — nodig vóórdat de EmailCampaign-rij zelf
  // bestaat. shortCode is bewust kort (8 tekens, base64url van 6 random bytes) voor een
  // leesbare link (/tickets/<code>); de lange, interne `id` blijft uit de URL.
  const id = randomUUID();
  const shortCode = randomBytes(6).toString("base64url");
  const ticketlink = `${getWebBaseUrl()}/tickets/${shortCode}`;

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.emailCampaign.create({
      data: {
        id,
        shortCode,
        organizationId: params.actor.organizationId,
        eventId: params.eventId,
        createdByUserId: params.actor.id,
        mailingTemplateId: params.mailingTemplateId || null,
        subject: params.subject,
        bodyHtml: params.bodyHtml,
        layoutId: params.layoutId || null,
        segment: params.segment as unknown as Prisma.InputJsonValue,
        totalRecipients: recipients.length,
      },
    });

    if (recipients.length > 0) {
      await tx.emailCampaignRecipient.createMany({
        data: recipients.map((r) => ({
          campaignId: created.id,
          email: r.email,
          personalization: { ...r.personalization, ticketlink } as Prisma.InputJsonValue,
        })),
      });
    }

    return created;
  });

  await logAudit({
    organizationId: params.actor.organizationId,
    actorUserId: params.actor.id,
    action: "mailing_campaign_created",
    entityType: "email_campaign",
    entityId: campaign.id,
    metadata: {
      subject: params.subject,
      eventId: params.eventId,
      totalRecipients: recipients.length,
      segment: params.segment,
    },
  });

  if (recipients.length > 0) {
    await scheduleBulkCampaignBatch(campaign.id, params.callbackUrl);
  } else {
    await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: "DONE" } });
  }

  return { id: campaign.id, totalRecipients: recipients.length };
}

function unsubscribeFooter(email: string): string {
  return `<hr /><p style="font-size:12px;color:#888;">Wil je geen e-mails meer ontvangen? ${buildUnsubscribeLinkHtml(email)}.</p>`;
}

/** Verwerkt tot BATCH_SIZE PENDING-recipients van een campagne en plant zichzelf opnieuw
 * (via dezelfde callbackUrl) als er daarna nog PENDING-recipients over zijn. Elke
 * recipient wordt direct na de send-poging op SENT/FAILED gezet (niet pas aan het eind
 * van de batch) — beperkt de impact van een QStash-retry op dezelfde batch tot maximaal
 * de recipients die nog niet verwerkt waren. */
export async function processCampaignBatch(campaignId: string, callbackUrl: string): Promise<void> {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status === "DONE") return;

  const batch = await prisma.emailCampaignRecipient.findMany({
    where: { campaignId, status: "PENDING" },
    take: BATCH_SIZE,
    orderBy: { id: "asc" },
  });

  if (batch.length === 0) {
    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: "DONE" } });
    return;
  }

  if (campaign.status === "QUEUED") {
    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: "SENDING" } });
  }

  const optOuts = await prisma.emailOptOut.findMany({ select: { email: true } });
  const optedOut = new Set(optOuts.map((o) => o.email.toLowerCase()));

  // Zelfde lay-out voor de hele batch (één campagne = één gekozen/standaard-lay-out) —
  // één keer opgezocht i.p.v. per recipient.
  const layoutHtml = await getEmailLayoutHtml({
    organizationId: campaign.organizationId,
    layoutId: campaign.layoutId,
  });

  for (const recipient of batch) {
    if (optedOut.has(recipient.email.toLowerCase())) {
      await prisma.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "SKIPPED_OPTOUT" } });
      await prisma.emailCampaign.update({ where: { id: campaignId }, data: { skippedCount: { increment: 1 } } });
      continue;
    }

    const personalization = recipient.personalization as Record<string, string>;
    const rendered = renderWithLayout({
      layoutHtml,
      content: { subject: campaign.subject, bodyHtml: campaign.bodyHtml + unsubscribeFooter(recipient.email) },
      vars: personalization,
    });

    const result = await sendEmail({ to: recipient.email, subject: rendered.subject, html: rendered.bodyHtml });

    if (result.ok) {
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      await prisma.emailCampaign.update({ where: { id: campaignId }, data: { sentCount: { increment: 1 } } });
    } else {
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "FAILED", error: result.error },
      });
      await prisma.emailCampaign.update({ where: { id: campaignId }, data: { failedCount: { increment: 1 } } });
    }
  }

  const remaining = await prisma.emailCampaignRecipient.count({ where: { campaignId, status: "PENDING" } });
  if (remaining > 0) {
    await scheduleBulkCampaignBatch(campaignId, callbackUrl, BATCH_DELAY);
  } else {
    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: "DONE" } });
  }
}
