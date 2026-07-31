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

export type MollieMode = "test" | "live";

const MOLLIE_MODE_SETTING = "mollie_mode";
const MOLLIE_TEST_KEY_SETTING = "mollie_test_api_key";
const MOLLIE_LIVE_KEY_SETTING = "mollie_live_api_key";

function settingKeyForMode(mode: MollieMode): string {
  return mode === "live" ? MOLLIE_LIVE_KEY_SETTING : MOLLIE_TEST_KEY_SETTING;
}

export async function getMollieMode(organizationId: string): Promise<MollieMode> {
  const stored = await getSetting(organizationId, MOLLIE_MODE_SETTING);
  return stored === "live" ? "live" : "test";
}

export async function setMollieMode(organizationId: string, mode: MollieMode): Promise<void> {
  await setSetting(organizationId, MOLLIE_MODE_SETTING, mode);
}

/** Fase 1/2: valt in test-modus terug op MOLLIE_TEST_API_KEY uit env zolang er nog geen
 * key via het instellingenscherm is opgeslagen (lokale ontwikkeling zonder UI-stap). */
export async function getMollieApiKey(organizationId: string): Promise<string> {
  const mode = await getMollieMode(organizationId);
  const stored = await getSetting(organizationId, settingKeyForMode(mode));
  if (stored) return stored;

  if (mode === "test") {
    const fallback = process.env.MOLLIE_TEST_API_KEY;
    if (fallback) return fallback;
  }

  throw new Error(
    `Geen Mollie-${mode}-API-key gevonden: zet 'm via het instellingenscherm` +
      (mode === "test" ? " of MOLLIE_TEST_API_KEY in .env voor lokale ontwikkeling." : "."),
  );
}

export async function setMollieApiKey(organizationId: string, mode: MollieMode, apiKey: string): Promise<void> {
  await setSetting(organizationId, settingKeyForMode(mode), apiKey, { isSecret: true });
}

/** Voor de instellingenpagina: laat zien of er al een key is opgeslagen, zonder de
 * waarde zelf terug te geven aan de browser. */
export async function hasMollieApiKey(organizationId: string, mode: MollieMode): Promise<boolean> {
  const stored = await getSetting(organizationId, settingKeyForMode(mode));
  return stored !== null;
}
