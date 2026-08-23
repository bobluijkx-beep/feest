import { cache } from "react";
import { prisma } from "@lions/core";

/** Eén event-lookup, gedeeld door de layout en alle onderliggende pagina's van
 * `/[eventSlug]/*` binnen één request (React's `cache()` dedupliceert identieke aanroepen
 * per request) — zo doet elke pagina niet opnieuw dezelfde "bestaat dit event en is het
 * gepubliceerd"-check. Pagina's die meer nodig hebben (producten, pageBlocks) doen daar
 * zelf een aanvullende, gerichte query bovenop. */
export const getPublicEvent = cache(async (slug: string) => {
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || event.status !== "PUBLISHED") return null;
  return event;
});
