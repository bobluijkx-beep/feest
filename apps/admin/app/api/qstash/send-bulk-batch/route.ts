import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { processCampaignBatch } from "@lions/core";

async function handler(request: Request) {
  const body = await request.json().catch(() => null);
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : null;
  if (!campaignId) {
    return NextResponse.json({ error: "Ontbrekend campaignId" }, { status: 400 });
  }

  const callbackUrl = new URL("/api/qstash/send-bulk-batch", request.url).toString();
  await processCampaignBatch(campaignId, callbackUrl);
  return NextResponse.json({ ok: true });
}

/** Wordt door QStash aangeroepen om telkens de volgende batch recipients van een
 * EmailCampaign te verwerken (zie packages/core/src/email/bulk-campaign.ts) — zelfde
 * signature-verificatie- en 503-zonder-sleutels-patroon als
 * apps/web/app/api/qstash/expire-order/route.ts. */
export async function POST(request: Request) {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY || !process.env.QSTASH_NEXT_SIGNING_KEY) {
    return NextResponse.json({ error: "QStash is niet geconfigureerd." }, { status: 503 });
  }

  const verifiedHandler = verifySignatureAppRouter(handler);
  return verifiedHandler(request);
}
