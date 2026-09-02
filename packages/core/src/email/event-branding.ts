import "server-only";
import { readEventThemeAssets } from "../utils/event-theme";
import { getImageDimensions } from "../utils/image-dimensions";

const LOGO_TARGET_HEIGHT = 56;
const HERO_TARGET_WIDTH = 560;

/** Bouwt de {{event_logo_html}}/{{event_hero_html}}-placeholders uit een Event.theme —
 * kant-en-klare <img>-markup (of lege string als er niets is ingesteld), zodat de lay-out
 * zelf geen URL-logica hoeft te kennen en een ontbrekende afbeelding nooit een kapot
 * <img src=""> oplevert. Zo krijgt de envelop dezelfde clublogo/sfeerfoto als de
 * bijbehorende event-pagina op de publieke site (apps/web/app/[eventSlug]/layout.tsx).
 *
 * Bewust in een eigen "server-only"-bestand i.p.v. in layout.ts: dat laatste wordt ook
 * client-side gebruikt voor de admin-voorbeeldweergave (layout-form.tsx e.d.) en mag dus
 * geen server-only afhankelijkheid importeren (getImageDimensions doet een fetch).
 *
 * Vraagt de echte pixelafmetingen van elke afbeelding op om er expliciete HTML
 * width/height-attributen bij te zetten (naast de CSS) — Outlook desktop rendert een
 * <img> op basis van die attributen, niet de CSS, dus een kale `style="height:56px"`
 * zonder passend `width`-attribuut levert daar een samengedrukt logo op. Lukt het ophalen
 * niet (netwerkfout, onbekend formaat), dan valt de afbeelding terug op alleen CSS-sizing
 * — werkt nog steeds in vrijwel alle mailclients, alleen Outlook desktop kan 'm dan
 * verkeerd schalen. */
export async function eventBrandingVars(theme: unknown): Promise<Record<string, string>> {
  const { logoUrl, heroImageUrl } = readEventThemeAssets(theme);

  const [logoDimensions, heroDimensions] = await Promise.all([
    logoUrl ? getImageDimensions(logoUrl) : Promise.resolve(null),
    heroImageUrl ? getImageDimensions(heroImageUrl) : Promise.resolve(null),
  ]);

  let event_logo_html = "";
  if (logoUrl) {
    const width = logoDimensions
      ? Math.round((logoDimensions.width / logoDimensions.height) * LOGO_TARGET_HEIGHT)
      : LOGO_TARGET_HEIGHT;
    event_logo_html = `<img src="${logoUrl}" alt="" width="${width}" height="${LOGO_TARGET_HEIGHT}" style="display:block;width:${width}px;height:${LOGO_TARGET_HEIGHT}px;max-width:160px;margin:0 auto 12px auto;" />`;
  }

  let event_hero_html = "";
  if (heroImageUrl) {
    const height = heroDimensions
      ? Math.round((heroDimensions.height / heroDimensions.width) * HERO_TARGET_WIDTH)
      : Math.round(HERO_TARGET_WIDTH * 0.5625);
    event_hero_html = `<img src="${heroImageUrl}" alt="" width="${HERO_TARGET_WIDTH}" height="${height}" style="display:block;width:100%;max-width:${HERO_TARGET_WIDTH}px;height:auto;" />`;
  }

  return { event_logo_html, event_hero_html };
}
