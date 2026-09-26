/** Kant-en-klare "deel dit met vrienden"-links voor in een mailing (zie {{whatsapp_share_link}}/
 * {{facebook_share_link}} in bulk-campaign.ts). Geen server-only: bevat geen geheimen, puur
 * stringopbouw — zou ook prima client-side (bv. een voorbeeldscherm) kunnen draaien.
 *
 * Instagram heeft bewust geen tegenhanger: er bestaat geen officiële web-share-link die een
 * Instagram-post/story met vooraf ingevulde tekst+link opent (in tegenstelling tot WhatsApp's
 * wa.me en Facebook's sharer.php) — dat kan alleen via Instagram's native app-SDK, niet vanuit
 * een simpele link in een e-mail. */
export function buildShareLinks(params: { eventName: string; url: string }): {
  whatsapp: string;
  facebook: string;
} {
  const message = `Ik ga naar ${params.eventName}! Ga jij ook mee? Koop hier je kaartjes: ${params.url}`;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(params.url)}`,
  };
}
