import "server-only";

/** Basis-URL van de publieke website — gebruikt om absolute links te bouwen buiten de
 * request-cyclus om (afmeldlink, songverzoek-link, Mollie's redirect-/webhook-URL), waar
 * geen inkomend request beschikbaar is om het domein uit af te leiden. Valt terug op
 * localhost voor lokale ontwikkeling zonder deze variabele. */
export function getWebBaseUrl(): string {
  return process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
}
