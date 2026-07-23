import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const secret = process.env.TICKET_QR_SECRET;
  if (!secret) throw new Error("TICKET_QR_SECRET ontbreekt.");
  return secret;
}

function sign(ticketId: string): string {
  return createHmac("sha256", getSecret()).update(ticketId).digest("base64url");
}

/** QR-inhoud: `${ticketId}.${signature}`. Een vervalste code wordt al hier afgewezen,
 * vóór er een databaselookup gebeurt. */
export function signQrToken(ticketId: string): string {
  return `${ticketId}.${sign(ticketId)}`;
}

export function verifyQrToken(token: string): { ticketId: string } | null {
  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const ticketId = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expected = sign(ticketId);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { ticketId };
}
