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
] as const;

/** Beschikbaar in een bulkmailing (segment.ts bepaalt de personalisatie per ontvanger). */
export const CAMPAIGN_PLACEHOLDERS = ["voornaam", "event_naam", "aantal_tickets"] as const;

/** Beschikbaar in een EmailLayout — de unie van bovenstaande, plus de verplichte
 * `content`-placeholder waar de eigenlijke e-mailinhoud wordt ingevoegd. Een lay-out kan
 * voor zowel templates als mailings gekozen worden, dus biedt de editor alles aan; welke
 * er in de praktijk iets invullen hangt af van waar de lay-out uiteindelijk voor gebruikt
 * wordt (renderWithLayout in layout.ts laat een ongebruikte placeholder gewoon staan). */
export const LAYOUT_PLACEHOLDERS = ["content", ...new Set([...ORDER_TEMPLATE_PLACEHOLDERS, ...CAMPAIGN_PLACEHOLDERS])];
