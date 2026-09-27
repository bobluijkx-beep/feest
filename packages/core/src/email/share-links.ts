import { renderTemplate } from "./template-engine";

/** Kant-en-klare "deel dit met vrienden"-links voor in een mailing (zie {{whatsapp_share_link}}/
 * {{facebook_share_link}} in bulk-campaign.ts). Geen server-only: bevat geen geheimen, puur
 * stringopbouw — zou ook prima client-side (bv. een voorbeeldscherm) kunnen draaien.
 *
 * Facebook's sharer.php heeft bewust geen aanpasbaar berichtsjabloon zoals WhatsApp: dat
 * platform accepteert geen vooraf ingevulde tekst en pakt zijn eigen voorbeeldkaart altijd van
 * de Open Graph-tags van de gedeelde pagina (dus stuurbaar via de event-naam/-omschrijving
 * zelf, zie [eventSlug]/layout.tsx — niet vanuit hier).
 *
 * Instagram heeft bewust geen tegenhanger: er bestaat geen officiële web-share-link die een
 * Instagram-post/story met vooraf ingevulde tekst+link opent (in tegenstelling tot WhatsApp's
 * wa.me en Facebook's sharer.php) — dat kan alleen via Instagram's native app-SDK, niet vanuit
 * een simpele link in een e-mail. */
export function buildShareLinks(params: { messageTemplate: string; eventName: string; url: string }): {
  whatsapp: string;
  facebook: string;
} {
  const message = renderTemplate(
    { subject: "", bodyHtml: params.messageTemplate },
    { event_naam: params.eventName, ticketlink: params.url },
  ).bodyHtml;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(params.url)}`,
  };
}
