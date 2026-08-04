import { NextResponse } from "next/server";
import { prisma, verifyQrToken, getCurrentUser, requireRole, hasEventAccess, AuthError } from "@lions/core";
import { getSupabaseServerClient } from "@/lib/supabase-server";

interface TicketInfo {
  buyerName: string;
  ticketTypeName: string;
}

/** Valideert + verwerkt een gescande ticket-QR. Gebruikt hier bewust getCurrentUser/
 * requireRole rechtstreeks in plaats van requireStaffRole() uit lib/require-role.ts:
 * die laatste doet een redirect() bij een auth-fout, wat voor een JSON-API-endpoint
 * (aangeroepen vanuit de scanner-client-JS, ook met een offline-wachtrij) een verwarrende
 * HTML-redirect-response zou geven in plaats van een nette foutstatus. */
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);

  let actor;
  try {
    actor = requireRole(user, ["ADMIN", "DOOR_STAFF"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ status: "invalid", error: err.message }, { status: err.status });
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  const qrToken = typeof body?.qrToken === "string" ? body.qrToken : null;
  const device = typeof body?.device === "string" ? body.device.slice(0, 200) : null;

  if (!qrToken) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  const verified = verifyQrToken(qrToken);
  if (!verified) {
    return NextResponse.json({ status: "invalid" });
  }

  if (actor.role === "DOOR_STAFF") {
    const ticketPreview = await prisma.ticket.findUnique({
      where: { id: verified.ticketId },
      select: { order: { select: { eventId: true } } },
    });
    if (!ticketPreview) {
      return NextResponse.json({ status: "invalid" });
    }
    if (!(await hasEventAccess(actor, ticketPreview.order.eventId))) {
      return NextResponse.json({ status: "no_access" });
    }
  }

  // Atomisch: SELECT ... FOR UPDATE voorkomt dat twee gelijktijdige scans van hetzelfde
  // ticket allebei als "eerste keer" worden verwerkt — zelfde lock-patroon als de
  // bestaande kassaflow (packages/core/src/checkout/create-order.ts).
  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT id, status FROM "tickets" WHERE id = ${verified.ticketId} FOR UPDATE`;
    const ticket = locked[0];
    if (!ticket) return { status: "invalid" as const };
    if (ticket.status === "CANCELLED") return { status: "cancelled" as const };
    if (ticket.status === "CHECKED_IN") return { status: "already_checked_in" as const };

    await tx.ticket.update({ where: { id: ticket.id }, data: { status: "CHECKED_IN" } });
    await tx.checkIn.create({ data: { ticketId: ticket.id, scannedBy: actor.email, device } });

    return { status: "ok" as const };
  });

  let ticketInfo: TicketInfo | null = null;
  if (result.status === "ok" || result.status === "already_checked_in") {
    const ticket = await prisma.ticket.findUnique({
      where: { id: verified.ticketId },
      include: { order: true, product: true },
    });
    if (ticket) {
      ticketInfo = { buyerName: ticket.order.buyerName, ticketTypeName: ticket.product.name };
    }
  }

  return NextResponse.json({ status: result.status, ticket: ticketInfo });
}
