export interface EventThemeAssets {
  logoUrl?: string;
  heroImageUrl?: string;
}

/** Leest de twee afbeeldingsvelden uit Event.theme (hetzelfde vrije-vorm JSON-veld als de
 * publieke site gebruikt, zie apps/web/app/[eventSlug]/layout.tsx en page.tsx) — gedeeld
 * door de orderbevestigingsmail (email/layout.ts) en het ticket-PDF (tickets/pdf.ts), zodat
 * beide dezelfde per-event branding (clublogo, sfeerfoto) tonen als de bijbehorende
 * event-pagina zelf, zonder de theme-JSON-vorm op twee plekken te hoeven kennen. */
export function readEventThemeAssets(theme: unknown): EventThemeAssets {
  const t = typeof theme === "object" && theme !== null ? (theme as Record<string, unknown>) : {};
  const logoUrl = typeof t.logoUrl === "string" && t.logoUrl ? t.logoUrl : undefined;
  const heroImageUrl = typeof t.heroImageUrl === "string" && t.heroImageUrl ? t.heroImageUrl : undefined;
  return { logoUrl, heroImageUrl };
}
