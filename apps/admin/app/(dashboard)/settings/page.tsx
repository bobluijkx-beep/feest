import { getMollieMode, hasMollieApiKey } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { MollieSettingsForm } from "./mollie-settings-form";

export default async function SettingsPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const [mode, hasTestKey, hasLiveKey] = await Promise.all([
    getMollieMode(actor.organizationId),
    hasMollieApiKey(actor.organizationId, "test"),
    hasMollieApiKey(actor.organizationId, "live"),
  ]);

  return <MollieSettingsForm mode={mode} hasTestKey={hasTestKey} hasLiveKey={hasLiveKey} />;
}
