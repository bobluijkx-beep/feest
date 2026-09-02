/** Centrale placeholder-lijsten, gedeeld door de admin-editors (e-mailtemplates,
 * mailings, lay-outs) zodat de "Placeholder invoegen"-knop en de documentatietekst
 * overal hetzelfde tonen. Puur namen (zonder `{{ }}`) — de editor voegt de accolades toe. */

/** Beschikbaar in de transactionele order-e-mailtemplates (order-confirmation.ts). */
export const ORDER_TEMPLATE_PLACEHOLDERS = [
  "voornaam",
  "event_naam",
  "aantal_tickets",
  "ticketcode",
  "datum",
  "locatie",
  "tickets_sectie",
  "merchandise",
  "afmeldlink",
] as const;

/** Beschikbaar in een bulkmailing (segment.ts bepaalt de personalisatie per ontvanger). */
export const CAMPAIGN_PLACEHOLDERS = ["voornaam", "event_naam", "aantal_tickets", "afmeldlink"] as const;

/** Beschikbaar in een EmailLayout — de unie van bovenstaande, plus de verplichte
 * `content`-placeholder waar de eigenlijke e-mailinhoud wordt ingevoegd, en de twee
 * event-branding-placeholders (kant-en-klare <img>-markup, leeg als het event geen
 * logo/sfeerfoto heeft ingesteld — zie event-branding.ts's eventBrandingVars). Een lay-out kan
 * voor zowel templates als mailings gekozen worden, dus biedt de editor alles aan; welke
 * er in de praktijk iets invullen hangt af van waar de lay-out uiteindelijk voor gebruikt
 * wordt (renderWithLayout in layout.ts laat een ongebruikte placeholder nooit onvervangen
 * staan — event_logo_html/event_hero_html/afmeldlink hebben altijd een leeg-string-
 * terugval).
 *
 * `afmeldlink` (een kant-en-klare "Afmelden"-link, unsubscribe.ts's
 * buildUnsubscribeLinkHtml) is bewust ook hier beschikbaar: bulkmailings plakken zelf al
 * automatisch een afmeldvoettekst aan (bulk-campaign.ts, wettelijk vereist voor
 * marketingmail), maar een bestuurslid kan 'm zo ook zelf een plek geven in de gedeelde
 * lay-out i.p.v. alleen onderaan losse campagnes. */
export const LAYOUT_PLACEHOLDERS = [
  "content",
  "event_logo_html",
  "event_hero_html",
  ...new Set([...ORDER_TEMPLATE_PLACEHOLDERS, ...CAMPAIGN_PLACEHOLDERS]),
];
