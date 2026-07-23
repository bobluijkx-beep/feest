import type { RenderableTemplate } from "./template-engine";

/** Fallback zolang er nog geen EmailTemplate-rij voor dit event bestaat (de
 * bewerkbare templates + editor komen in fase 2). */
export const defaultOrderConfirmationTemplate: RenderableTemplate = {
  subject: "Je tickets voor {{event_naam}}",
  bodyHtml: `
    <p>Beste {{voornaam}},</p>
    <p>Bedankt voor je bestelling! Hierbij ontvang je {{aantal_tickets}} ticket(s) voor
    <strong>{{event_naam}}</strong> op {{datum}} in {{locatie}}.</p>
    <p>Je tickets (met QR-code) vind je als bijlage bij deze e-mail. Neem ze mee op je
    telefoon of geprint naar het evenement.</p>
    <p>Tot dan!<br/>Lionsclub Voorschoten</p>
  `.trim(),
};
