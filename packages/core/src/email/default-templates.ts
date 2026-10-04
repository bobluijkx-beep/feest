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
      {{songverzoek}}
      <p>Tot dan!<br/>Lionsclub Voorschoten</p>
      <p style="margin-top:24px;font-size:12px;color:#8a8a8d;">Wil je geen e-mails meer van ons ontvangen? {{afmeldlink}}.</p>
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
      <p style="margin-top:24px;font-size:12px;color:#8a8a8d;">Wil je geen e-mails meer van ons ontvangen? {{afmeldlink}}.</p>
    `.trim(),
  },
  PAYMENT_REMINDER: {
    subject: "Rond je bestelling voor {{event_naam}} af",
    bodyHtml: `
      <p>Beste {{voornaam}},</p>
      <p>Je bent bijna klaar! Je bestelling voor <strong>{{event_naam}}</strong> staat nog
      klaar, maar de betaling is nog niet afgerond.</p>
      <p>Lionsclub Voorschoten</p>
      <p style="margin-top:24px;font-size:12px;color:#8a8a8d;">Wil je geen e-mails meer van ons ontvangen? {{afmeldlink}}.</p>
    `.trim(),
  },
  CANCELLATION_REFUND: {
    subject: "Je terugbetaling voor {{event_naam}}",
    bodyHtml: `
      <p>Beste {{voornaam}},</p>
      <p>We hebben je terugbetaling van <strong>{{bedrag}}</strong> voor <strong>{{event_naam}}</strong>
      in gang gezet. Het bedrag wordt teruggestort op de rekening waarmee je hebt betaald; dat kan
      enkele werkdagen duren.</p>
      {{eerdere_donatie}}
      <p>Onze excuses dat het feest niet doorgaat.</p>
      <p>Lionsclub Voorschoten</p>
    `.trim(),
  },
  CANCELLATION_PARTIAL: {
    subject: "Je terugbetaling en donatie voor {{event_naam}}",
    bodyHtml: `
      <p>Beste {{voornaam}},</p>
      <p>Bedankt voor je keuze. Van je bestelling voor <strong>{{event_naam}}</strong> storten we
      <strong>{{terugbetaald_bedrag}}</strong> terug op de rekening waarmee je hebt betaald (dat kan
      enkele werkdagen duren) en doneer je <strong>{{gedoneerd_bedrag}}</strong> aan ons goede doel.
      Je tickets zijn komen te vervallen.</p>
      {{eerdere_donatie}}
      <p>Onze excuses dat het feest niet doorgaat — en bedankt voor je steun.</p>
      <p>Lionsclub Voorschoten</p>
    `.trim(),
  },
  CANCELLATION_DONATE: {
    subject: "Bedankt voor je donatie aan het goede doel",
    bodyHtml: `
      <p>Beste {{voornaam}},</p>
      <p>Hartelijk dank! Je hebt gekozen om <strong>{{bedrag}}</strong> van je bestelling voor
      <strong>{{event_naam}}</strong> te doneren aan ons goede doel. Je tickets zijn komen te vervallen
      en er wordt niets teruggestort.</p>
      {{eerdere_donatie}}
      <p>Onze excuses dat het feest niet doorgaat — en bedankt voor je steun.</p>
      <p>Lionsclub Voorschoten</p>
    `.trim(),
  },
  CANCELLED: {
    subject: "Je bestelling voor {{event_naam}} is geannuleerd",
    bodyHtml: `
      <p>Beste {{voornaam}},</p>
      <p>Je bestelling voor <strong>{{event_naam}}</strong> is geannuleerd.</p>
      <p>Lionsclub Voorschoten</p>
      <p style="margin-top:24px;font-size:12px;color:#8a8a8d;">Wil je geen e-mails meer van ons ontvangen? {{afmeldlink}}.</p>
    `.trim(),
  },
};
