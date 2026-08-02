import { prisma } from "@lions/core";
import type { Event } from "@lions/db";

/** Gedeelde event-selectie voor admin-pagina's die per event werken (dashboard,
 * e-mailtemplates, paginabeheer). Leest `?eventId=` uit de zoekopdracht; valt terug op
 * het meest recente event als er geen (geldige) `eventId` is meegegeven. */
export async function getSelectedEvent(
  organizationId: string,
  eventIdParam?: string,
): Promise<{ events: Event[]; selected: Event | null }> {
  const events = await prisma.event.findMany({
    where: { organizationId },
    orderBy: { startsAt: "desc" },
  });
  const selected = eventIdParam ? events.find((e) => e.id === eventIdParam) : undefined;
  return { events, selected: selected ?? events[0] ?? null };
}
