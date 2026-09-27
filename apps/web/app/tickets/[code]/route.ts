import { NextResponse, type NextRequest } from "next/server";
import { prisma, getWebBaseUrl, readEventThemeAssets } from "@lions/core";
import { stripHtml } from "@/lib/strip-html";

const REF_COOKIE_NAME = "feest_ref";
const REF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Bekende linkvoorvertoning-crawlers (WhatsApp, Facebook/Messenger, Telegram, Slack, …) —
// zie de uitleg bij CRAWLER_UA_PATTERN hieronder voor waarom die een aparte respons krijgen.
const CRAWLER_UA_PATTERN =
  /whatsapp|facebookexternalhit|facebot|twitterbot|slackbot|telegrambot|linkedinbot|discordbot|redditbot|viber|line\/|skypeuripreview|pinterest/i;

/** Korte, deelbare mailinglink ({{ticketlink}} in packages/core/src/email/bulk-campaign.ts) i.p.v.
 * de volledige /<eventSlug>/producten?ref=<id>-vorm. Zet de attributiecookie hier zelf en stuurt
 * door naar de schone productenpagina, zodat de lelijke ref-waarde nergens in de adresbalk komt.
 *
 * CRAWLER_UA_PATTERN: een kale 307-redirect heeft zelf geen HTML/Open Graph-tags — een
 * linkvoorvertoning-crawler (WhatsApp e.d.) moet dus eerst de redirect volgen tot de
 * uiteindelijke productenpagina om een plaatje+omschrijving te vinden, en doet dat in de
 * praktijk niet betrouwbaar (vandaar de melding dat de voorvertoning na de eerste deploy
 * weer verdween: waarschijnlijk een keer wél gevolgd, daarna niet meer — en eenmaal zonder
 * voorvertoning gecachet, blijft WhatsApp dat een tijd tonen). Voor herkende crawlers wordt
 * daarom, zonder redirect, direct een minimale HTML-pagina mét de Open Graph-tags
 * teruggegeven; een echte bezoeker (elke andere User-Agent) krijgt gewoon de bestaande
 * cookie+redirect. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const { code } = await params;

  const campaign = await prisma.emailCampaign.findUnique({
    where: { shortCode: code },
    select: { id: true, event: { select: { slug: true, name: true, description: true, theme: true } } },
  });

  const baseUrl = getWebBaseUrl();
  if (!campaign) return NextResponse.redirect(new URL("/", baseUrl));

  const destination = new URL(`/${campaign.event.slug}/producten`, baseUrl);

  const userAgent = request.headers.get("user-agent") ?? "";
  if (CRAWLER_UA_PATTERN.test(userAgent)) {
    const { heroImageUrl } = readEventThemeAssets(campaign.event.theme);
    const description = campaign.event.description
      ? stripHtml(campaign.event.description).slice(0, 160)
      : `Doe mee met ${campaign.event.name}!`;
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

    const html = `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <title>${escape(campaign.event.name)}</title>
    <meta property="og:title" content="${escape(campaign.event.name)}" />
    <meta property="og:description" content="${escape(description)}" />
    ${heroImageUrl ? `<meta property="og:image" content="${escape(heroImageUrl)}" />` : ""}
    <meta property="og:url" content="${destination.toString()}" />
    <meta http-equiv="refresh" content="0; url=${destination.toString()}" />
  </head>
  <body>
    <a href="${destination.toString()}">${escape(campaign.event.name)}</a>
  </body>
</html>`;
    return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  const response = NextResponse.redirect(destination);
  response.cookies.set(REF_COOKIE_NAME, campaign.id, {
    maxAge: REF_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
