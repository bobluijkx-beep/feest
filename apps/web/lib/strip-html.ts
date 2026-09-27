/** Voor een meta-description/OG-tekst: HTML-tags eruit, whitespace platgeslagen. Gedeeld door
 * [eventSlug]/layout.tsx en tickets/[code]/route.ts (allebei bouwen Open Graph-metadata op uit
 * Event.description, dat zelf HTML is — zie de HtmlEditor waarmee bestuursleden 'm invullen). */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
