import "server-only";
import { prisma } from "../db";
import { decryptSettingValue, encryptSettingValue } from "./encryption";

export async function getSetting(organizationId: string, key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { organizationId_key: { organizationId, key } } });
  if (!row) return null;
  return decryptSettingValue(row.valueEncrypted);
}

export async function setSetting(
  organizationId: string,
  key: string,
  value: string,
  options: { isSecret?: boolean } = {},
): Promise<void> {
  const valueEncrypted = encryptSettingValue(value);
  await prisma.setting.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, valueEncrypted, isSecret: options.isSecret ?? false },
    update: { valueEncrypted, isSecret: options.isSecret ?? false },
  });
}

const MOLLIE_API_KEY_SETTING = "mollie_api_key";

/** Fase 1: valt terug op MOLLIE_TEST_API_KEY uit env als er nog geen key in de
 * Setting-tabel staat (die komt met het instellingenscherm in fase 2). */
export async function getMollieApiKey(organizationId: string): Promise<string> {
  const stored = await getSetting(organizationId, MOLLIE_API_KEY_SETTING);
  if (stored) return stored;

  const fallback = process.env.MOLLIE_TEST_API_KEY;
  if (!fallback) {
    throw new Error(
      "Geen Mollie-API-key gevonden: zet 'm via setSetting() of MOLLIE_TEST_API_KEY in .env voor lokale ontwikkeling.",
    );
  }
  return fallback;
}

export async function setMollieApiKey(organizationId: string, apiKey: string): Promise<void> {
  await setSetting(organizationId, MOLLIE_API_KEY_SETTING, apiKey, { isSecret: true });
}
