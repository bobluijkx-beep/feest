import { NextResponse, type NextRequest } from "next/server";

const REF_COOKIE_NAME = "feest_ref";
const REF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Vangt ?ref=<campagne-id> uit een mailinglink (zie packages/core/src/email/bulk-campaign.ts's
// ticketlink) op in een cookie, zodat de attributie ook nog geldt als de bezoeker via de
// producten-pagina binnenkomt maar pas later (op een andere pagina) afrekent. De waarde wordt
// pas tegen een echte EmailCampaign-rij gevalideerd in createOrder() — hier alleen doorgeven.
export function middleware(request: NextRequest): NextResponse {
  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref) return NextResponse.next();

  const response = NextResponse.next();
  response.cookies.set(REF_COOKIE_NAME, ref, {
    maxAge: REF_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
