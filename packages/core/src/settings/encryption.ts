import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) throw new Error("SETTINGS_ENCRYPTION_KEY ontbreekt.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY moet een base64-encoded 32-byte sleutel zijn (genereer met: openssl rand -base64 32).",
    );
  }
  return key;
}

/** Versleutelt een waarde voor opslag in Setting.valueEncrypted. Formaat: iv.authTag.ciphertext (elk base64). */
export function encryptSettingValue(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSettingValue(packed: string): string {
  const [ivB64, authTagB64, ciphertextB64] = packed.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Ongeldig versleuteld waardeformaat.");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
