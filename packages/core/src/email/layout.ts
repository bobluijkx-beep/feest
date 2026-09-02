import { renderTemplate, type RenderableTemplate } from "./template-engine";

/** Gedeelde e-mail-laag: omlijst de per-type/per-campagne inhoud (order-confirmation.ts/
 * bulk-campaign.ts leveren alleen de binnenkant, zie default-templates.ts) met een
 * kies bare huisstijl-header/footer (EmailLayout, org-breed, zie get-layout.ts). Een
 * lay-out is zelf ook maar een HTML-string met precies één verplichte placeholder,
 * {{content}} — verder gewone HTML, table-based + volledig inline-gestyled, bewust geen
 * flexbox/grid/externe stylesheet/custom font, want die worden in te veel mailclients
 * (met name Outlook desktop) genegeerd of stukgerenderd. Geen "server-only": deze module
 * wordt zowel server-side (bij het echt verzenden) als in de browser (het admin-
 * voorbeeldscherm) gebruikt, zodat bestuursleden precies zien wat er verstuurd wordt. */

const WEB_SAFE_BODY_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const WEB_SAFE_DISPLAY_FONT = "'Arial Black', Arial, 'Segoe UI', sans-serif";

/** Onzichtbare preview-snippet die mailclients tonen naast de afzender in de inbox-lijst
 * (i.p.v. de eerste toevallige regel van de e-mail zelf, vaak een kale "Beste Jan,"). */
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">${text}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`;
}

/** Placeholder verplicht in elke EmailLayout.bodyHtml — hier wordt de eigenlijke
 * e-mailinhoud ingevoegd. Los geëxporteerd zodat de admin-editor 'm kan valideren/
 * aanbieden als invoegbare placeholder, net als {{voornaam}} e.d. */
export const LAYOUT_CONTENT_PLACEHOLDER = "{{content}}";

/** De meegeleverde standaard-lay-out (zwarte kopbalk met clubnaam, witte inhoudskaart,
 * grijze voettekst) — het startpunt voor een nieuwe EmailLayout-rij, en de allerlaatste
 * terugvaloptie (getEmailLayoutHtml in get-layout.ts) als een organisatie nog geen enkele
 * lay-out heeft (bv. direct na deze migratie, vóór het zaaien van een standaardrij). */
export const DEFAULT_LAYOUT_HTML = `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
  </head>
  <body style="margin:0;padding:0;background-color:#f2f2f3;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f2f3;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#0a0a0a;padding:0;text-align:center;">
                {{event_hero_html}}
                <div style="padding:28px 32px;">
                  {{event_logo_html}}
                  <span style="font-family:${WEB_SAFE_DISPLAY_FONT};font-size:20px;letter-spacing:0.06em;color:#ffffff;text-transform:uppercase;">
                    Lionsclub Voorschoten
                  </span>
                  <div style="margin-top:10px;height:2px;width:64px;background-color:#c7cad0;margin-left:auto;margin-right:auto;"></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;padding:36px 32px;font-family:${WEB_SAFE_BODY_FONT};font-size:15px;line-height:1.6;color:#1a1a1a;">
                {{content}}
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;padding:0 32px 32px 32px;font-family:${WEB_SAFE_BODY_FONT};">
                <div style="height:1px;background-color:#e5e5e6;margin-bottom:20px;"></div>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8a8d;">
                  Lionsclub Voorschoten &middot; service, vriendschap en hulp aan wie het nodig heeft.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

/** Combineert een (gekozen) lay-out met de per-mail inhoud tot één verzendklare
 * HTML-pagina. Twee stappen, bewust in deze volgorde:
 * 1. De inhoud (`content`) wordt gerenderd met de gewone placeholders (voornaam,
 *    event_naam, …) — precies zoals voorheen.
 * 2. Het resultaat wordt als `content`-variabele meegegeven aan een renderTemplate-pas
 *    over de lay-out zelf, zodat de lay-out zowel `{{content}}` (verplicht) als
 *    diezelfde placeholders mag gebruiken (bv. `{{event_naam}}` in een aangepaste
 *    kopregel). De inhoud is dan al gesubstitueerd, dus er is geen risico op een
 *    tweede/foute substitutieronde binnen de ingevoegde inhoud zelf. */
export function renderWithLayout(params: {
  layoutHtml: string;
  content: RenderableTemplate;
  vars: Record<string, string>;
}): RenderableTemplate {
  const { layoutHtml, content, vars } = params;
  // event_logo_html/event_hero_html/afmeldlink standaard leeg: een aanroeper die ze niet
  // meegeeft (bv. wrapEmailHtml, of een toekomstig e-mailtype zonder bekende ontvanger)
  // mag nooit de kale placeholder-tekst laten doorlekken in de verzonden e-mail.
  const mergedVars = { event_logo_html: "", event_hero_html: "", afmeldlink: "", ...vars };
  const renderedContent = renderTemplate(content, mergedVars);
  const withPreheader = preheader(renderedContent.subject) + renderedContent.bodyHtml;
  const page = renderTemplate(
    { subject: renderedContent.subject, bodyHtml: layoutHtml },
    { ...mergedVars, content: withPreheader },
  );
  return page;
}

/** Gemakslaag voor de admin-preview en de allereenvoudigste gevallen: rendert direct met
 * de meegeleverde standaard-lay-out, zonder database-lookup. */
export function wrapEmailHtml(params: { subject: string; bodyHtml: string }): string {
  return renderWithLayout({
    layoutHtml: DEFAULT_LAYOUT_HTML,
    content: { subject: params.subject, bodyHtml: params.bodyHtml },
    vars: {},
  }).bodyHtml;
}
