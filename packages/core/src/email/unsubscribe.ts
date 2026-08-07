import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const secret = process.env.TICKET_QR_SECRET;
  if (!secret) throw new Error("TICKET_QR_SECRET ontbreekt.");
  return secret;
}

function sign(email: string): string {
  return createHmac("sha256", getSecret()).update(`unsub:${email}`).digest("base64url");
}

/** Hergebruikt TICKET_QR_SECRET als generieke token-sign-sleutel (geen nieuwe env var
 * nodig) — het `"unsub:"`-prefix in de signed payload zorgt voor domeinscheiding t.o.v.
 * ticket-QR-tokens (packages/core/src/tickets/qr.ts), dus een QR-token is nooit ook een
 * geldig afmeldtoken en vice versa. */
export function signUnsubscribeToken(email: string): string {
  return `${Buffer.from(email, "utf8").toString("base64url")}.${sign(email)}`;
}

export function verifyUnsubscribeToken(token: string): { email: string } | null {
  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const encodedEmail = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  let email: string;
  try {
    email = Buffer.from(encodedEmail, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email) return null;

  const expected = sign(email);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { email };
}
