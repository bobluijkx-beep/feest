import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getWebBaseUrl } from "../utils/base-url";

function getSecret(): string {
  const secret = process.env.TICKET_QR_SECRET;
  if (!secret) throw new Error("TICKET_QR_SECRET ontbreekt.");
  return secret;
}

function sign(orderId: string): string {
  return createHmac("sha256", getSecret()).update(`songreq:${orderId}`).digest("base64url");
}

/** Hergebruikt TICKET_QR_SECRET net als het afmeldtoken (email/unsubscribe.ts) — het
 * "songreq:"-prefix zorgt voor domeinscheiding t.o.v. ticket-QR- en afmeldtokens, dus geen
 * van de drie is ooit ook geldig voor een van de andere twee. */
export function signSongRequestToken(orderId: string): string {
  return `${Buffer.from(orderId, "utf8").toString("base64url")}.${sign(orderId)}`;
}

export function verifySongRequestToken(token: string): { orderId: string } | null {
  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const encodedOrderId = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  let orderId: string;
  try {
    orderId = Buffer.from(encodedOrderId, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!orderId) return null;

  const expected = sign(orderId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { orderId };
}

/** Kant-en-klare verzoeklink voor deze bestelling — gebruikt in de orderbevestiging
 * ({{songverzoek}}-plekhouder, order-confirmation.ts) en desgewenst elders. */
export function buildSongRequestUrl(orderId: string): string {
  const token = signSongRequestToken(orderId);
  return `${getWebBaseUrl()}/verzoeken?token=${token}`;
}
