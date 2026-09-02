import "server-only";
import { prisma } from "../db";
import { LAYOUT_PLACEHOLDERS } from "./placeholders";

/** Systeem-placeholdernamen (voornaam, event_naam, event_logo_html, …) — een bestuurslid
 * mag geen CustomPlaceholder met dezelfde naam aanmaken, want die zou dan (afhankelijk
 * van mergevolgorde) een systeemwaarde overschrijven of juist zelf nooit gebruikt worden.
 * Ook het verplichte "content" staat in deze lijst. */
export const RESERVED_PLACEHOLDER_KEYS = new Set<string>(LAYOUT_PLACEHOLDERS);

/** Geldige placeholdersleutel: hetzelfde patroon als de `{{\w+}}`-substitutie in
 * template-engine.ts verwacht (letters/cijfers/underscore, geen accolades). */
export const PLACEHOLDER_KEY_PATTERN = /^\w+$/;

/** Haalt alle door het bestuur zelf onderhouden {{placeholder}}'s van een organisatie op
 * (CustomPlaceholder, org-breed, vaste HTML-waarde — zie de admin-sectie
 * /content/emails/placeholders) als kant-en-klare vars voor renderWithLayout. Gedeeld door
 * order-confirmation.ts en segment.ts, dus telkens vóór de systeem-vars gespreid: mocht
 * een sleutel toch ooit botsen (zou de aanmaak-validatie al moeten voorkomen), dan wint de
 * systeemwaarde altijd. */
export async function getCustomPlaceholderVars(organizationId: string): Promise<Record<string, string>> {
  const rows = await prisma.customPlaceholder.findMany({ where: { organizationId } });
  return Object.fromEntries(rows.map((row) => [row.key, row.valueHtml]));
}
