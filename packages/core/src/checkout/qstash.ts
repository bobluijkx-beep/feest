import "server-only";
import { Client } from "@upstash/qstash";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Ontbrekende environment variable: ${name}`);
  return value;
}

/** Plant één uitgestelde aanroep die precies bij het verlopen van de voorraad-hold
 * (15 min na aanmaak) het bijbehorende endpoint aanroept — geen doorlopende polling
 * nodig. Het endpoint checkt dan alleen déze ene order en doet niets als 'm intussen al
 * PAID/FAILED/etc. is (idempotent). De dagelijkse Vercel Cron (expireStaleOrders) blijft
 * daarnaast bestaan als vangnet voor het zeldzame geval dat deze aanroep nooit aankomt. */
export async function scheduleOrderExpiry(orderId: string, callbackUrl: string): Promise<void> {
  const client = new Client({
    token: requireEnv("QSTASH_TOKEN"),
    // Sommige QStash-instances draaien op een regio-specifiek adres i.p.v. het globale
    // qstash.upstash.io — als QSTASH_URL is gezet, gebruiken we die expliciet in plaats
    // van stilzwijgend op het (mogelijk niet-werkende) default te vertrouwen.
    baseUrl: process.env.QSTASH_URL,
  });
  const result = await client.publishJSON({
    url: callbackUrl,
    body: { orderId },
    delay: "15m",
  });
  console.log("QStash-opruiming gepland voor order", orderId, "messageId:", result.messageId);
}
