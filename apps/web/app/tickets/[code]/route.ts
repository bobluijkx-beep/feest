import { NextResponse, type NextRequest } from "next/server";
import { prisma, getWebBaseUrl } from "@lions/core";

const REF_COOKIE_NAME = "feest_ref";
const REF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Korte, deelbare mailinglink ({{ticketlink}} in packages/core/src/email/bulk-campaign.ts) i.p.v.
// de volledige /<eventSlug>/producten?ref=<id>-vorm. Zet de attributiecookie hier zelf en stuurt
// door naar de schone productenpagina, zodat de lelijke ref-waarde nergens in de adresbalk komt.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const { code } = await params;

  const campaign = await prisma.emailCampaign.findUnique({
    where: { shortCode: code },
    select: { id: true, event: { select: { slug: true } } },
  });

  const baseUrl = getWebBaseUrl();
  if (!campaign) return NextResponse.redirect(new URL("/", baseUrl));

  const response = NextResponse.redirect(new URL(`/${campaign.event.slug}/producten`, baseUrl));
  response.cookies.set(REF_COOKIE_NAME, campaign.id, {
    maxAge: REF_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
