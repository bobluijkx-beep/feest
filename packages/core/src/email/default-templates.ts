import type { EmailTemplateType } from "@lions/db";
import type { RenderableTemplate } from "./template-engine";

/** Fallback zolang er nog geen EmailTemplate-rij voor dit event/type bestaat (de
 * bewerkbare templates + editor zijn onderdeel van fase 2). */
export const defaultEmailTemplates: Record<EmailTemplateType, RenderableTemplate> = {
  ORDER_CONFIRMATION: {
    subject: "Je bestelling voor {{event_naam}}",
    bodyHtml: `
      <p>Beste {{voornaam}},</p>
      <p>Bedankt voor je bestelling voor <strong>{{event_naam}}</strong> op {{datum}} in
      {{locatie}}.</p>
      {{tickets_sectie}}
      {{merchandise}}
      <p>Tot dan!<br/>Lionsclub Voorschoten</p>
    `.trim(),
  },
  PAYMENT_FAILED: {
    subject: "Betaling voor {{event_naam}} niet gelukt",
    bodyHtml: `
      <p>Beste {{voornaam}},</p>
      <p>Helaas is de betaling voor je bestelling voor <strong>{{event_naam}}</strong>
      niet gelukt, geannuleerd of verlopen. Er is niets afgeschreven en je tickets zijn
      niet gereserveerd.</p>
      <p>Wil je het nog eens proberen? Ga terug naar de website en start een nieuwe
      bestelling.</p>
      <p>Lionsclub Voorschoten</p>
    `.trim(),
  },
  PAYMENT_REMINDER: {
    subject: "Rond je bestelling voor {{event_naam}} af",
    bodyHtml: `
      <p>Beste {{voornaam}},</p>
      <p>Je bent bijna klaar! Je bestelling voor <strong>{{event_naam}}</strong> staat nog
      klaar, maar de betaling is nog niet afgerond.</p>
      <p>Lionsclub Voorschoten</p>
    `.trim(),
  },
  CANCELLED: {
    subject: "Je bestelling voor {{event_naam}} is geannuleerd",
    bodyHtml: `
      <p>Beste {{voornaam}},</p>
      <p>Je bestelling voor <strong>{{event_naam}}</strong> is geannuleerd.</p>
      <p>Lionsclub Voorschoten</p>
    `.trim(),
  },
};
