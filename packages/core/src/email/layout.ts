/** Gedeelde e-mail-laag: omlijst de per-type inhoud (order-confirmation.ts/
 * bulk-campaign.ts leveren alleen de binnenkant, zie default-templates.ts) met een vaste
 * huisstijl-header/footer. Table-based + volledig inline-gestylede HTML, bewust geen
 * flexbox/grid/externe stylesheet/custom font — die worden in te veel mailclients
 * (met name Outlook desktop) genegeerd of stukgerenderd. Geen "server-only": deze module
 * wordt zowel door resend.ts (bij het echt verzenden) als door het admin-voorbeeldscherm
 * (email-template-form.tsx, in de browser) gebruikt, zodat bestuursleden precies zien wat
 * er verstuurd wordt. */

const WEB_SAFE_BODY_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const WEB_SAFE_DISPLAY_FONT = "'Arial Black', Arial, 'Segoe UI', sans-serif";

/** Onzichtbare preview-snippet die mailclients tonen naast de afzender in de inbox-lijst
 * (i.p.v. de eerste toevallige regel van de e-mail zelf, vaak een kale "Beste Jan,"). */
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">${text}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`;
}

/** Omlijst de binnenkant van een e-mail (subject + bodyHtml, al met placeholders
 * vervangen) met de vaste Lionsclub Voorschoten-huisstijl: zwarte kopbalk met
 * clubnaam, witte inhoudskaart, grijze voettekst. Generiek per event (geen
 * event-specifiek logo/kleur) omdat dezelfde e-mail-infrastructuur voor elk event
 * (feest, oliebollenverkoop, …) gebruikt wordt. */
export function wrapEmailHtml(params: { subject: string; bodyHtml: string }): string {
  const { subject, bodyHtml } = params;
  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f2f2f3;">
    ${preheader(subject)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f2f3;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#0a0a0a;padding:28px 32px;text-align:center;">
                <span style="font-family:${WEB_SAFE_DISPLAY_FONT};font-size:20px;letter-spacing:0.06em;color:#ffffff;text-transform:uppercase;">
                  Lionsclub Voorschoten
                </span>
                <div style="margin-top:10px;height:2px;width:64px;background-color:#c7cad0;margin-left:auto;margin-right:auto;"></div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;padding:36px 32px;font-family:${WEB_SAFE_BODY_FONT};font-size:15px;line-height:1.6;color:#1a1a1a;">
                ${bodyHtml}
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
}
