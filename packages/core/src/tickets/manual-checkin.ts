import "server-only";
import { prisma } from "../db";

type CheckInResult = { ok: true } | { ok: false; error: string };

/** Handmatige incheckcorrectie in de admin — voor als scannen niet lukte (geen bereik,
 * kapotte QR) of er per ongeluk verkeerd is ingecheckt. Zelfde lock-patroon en
 * status-overgang als de scanner zelf (apps/scanner/app/api/checkin/route.ts), alleen
 * hier bewust zonder qrToken-verificatie (de admin kiest het ticket al rechtstreeks uit
 * de bestelling) en met scannedBy/device die de handmatige herkomst vastleggen.
 *
 * Inchecken: alleen toegestaan vanuit UNUSED (niet CANCELLED, niet al CHECKED_IN).
 * Ongedaan maken: zet terug naar UNUSED en verwijdert de bijbehorende CheckIn-rij(en) —
 * onder de normale scanflow ontstaat er sowieso maar één CheckIn-rij per ticket. */
export async function setTicketCheckedIn(
  ticketId: string,
  checkedIn: boolean,
  actorEmail: string,
): Promise<CheckInResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT id, status FROM "tickets" WHERE id = ${ticketId} FOR UPDATE`;
    const ticket = locked[0];
    if (!ticket) return { ok: false, error: "Ticket niet gevonden." };

    if (checkedIn) {
      if (ticket.status === "CANCELLED") return { ok: false, error: "Een geannuleerd ticket kan niet ingecheckt worden." };
      if (ticket.status === "CHECKED_IN") return { ok: true };
      await tx.ticket.update({ where: { id: ticket.id }, data: { status: "CHECKED_IN" } });
      await tx.checkIn.create({ data: { ticketId: ticket.id, scannedBy: actorEmail, device: "admin-handmatig" } });
    } else {
      if (ticket.status !== "CHECKED_IN") return { ok: true };
      await tx.ticket.update({ where: { id: ticket.id }, data: { status: "UNUSED" } });
      await tx.checkIn.deleteMany({ where: { ticketId: ticket.id } });
    }

    return { ok: true };
  });
}
