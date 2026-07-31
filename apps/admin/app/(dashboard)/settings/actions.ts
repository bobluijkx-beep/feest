"use server";

import { revalidatePath } from "next/cache";
import { setMollieMode, setMollieApiKey, type MollieMode } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

export interface SettingsFormState {
  error?: string;
  success?: boolean;
}

export async function updateMollieSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const mode = String(formData.get("mode") ?? "test") as MollieMode;
  if (mode !== "test" && mode !== "live") {
    return { error: "Ongeldige modus." };
  }

  const testKey = String(formData.get("testKey") ?? "").trim();
  const liveKey = String(formData.get("liveKey") ?? "").trim();

  if (testKey && !testKey.startsWith("test_")) {
    return { error: "Test-API-key moet beginnen met 'test_'." };
  }
  if (liveKey && !liveKey.startsWith("live_")) {
    return { error: "Live-API-key moet beginnen met 'live_'." };
  }

  await setMollieMode(actor.organizationId, mode);
  if (testKey) await setMollieApiKey(actor.organizationId, "test", testKey);
  if (liveKey) await setMollieApiKey(actor.organizationId, "live", liveKey);

  revalidatePath("/settings");
  return { success: true };
}
