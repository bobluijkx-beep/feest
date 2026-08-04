import { prisma, scopeEventsForActor, type AppUser } from "@lions/core";
import type { Event } from "@lions/db";

/** Gedeelde event-selectie voor admin-pagina's die per event werken (dashboard,
 * e-mailtemplates, paginabeheer). Leest `?eventId=` uit de zoekopdracht; valt terug op
 * het eerstvolgende event (startsAt >= nu) als er geen (geldige) `eventId` is
 * meegegeven, of anders het meest recente verleden-event. Alleen `isVisible`-events en
 * (voor EDITOR/DOOR_STAFF) alleen events waar de gebruiker toegang toe heeft. */
export async function getSelectedEvent(
  actor: AppUser,
  eventIdParam?: string,
): Promise<{ events: Event[]; selected: Event | null }> {
  const allEvents = await prisma.event.findMany({
    where: { organizationId: actor.organizationId, isVisible: true },
    orderBy: { startsAt: "asc" },
  });
  const events = await scopeEventsForActor(actor, allEvents);

  const now = new Date();
  const defaultEvent = events.find((e) => e.startsAt >= now) ?? events[events.length - 1] ?? null;
  const selected = eventIdParam ? events.find((e) => e.id === eventIdParam) : undefined;

  return { events, selected: selected ?? defaultEvent };
}
