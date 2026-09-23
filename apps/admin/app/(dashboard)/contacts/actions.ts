"use server";

import { revalidatePath } from "next/cache";
import { importContacts, syncOrderContactsIntoAddressBook, logAudit } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

export interface ContactActionState {
  error?: string;
  message?: string;
}

export async function importContactsAction(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const rawText = String(formData.get("rows") ?? "");
  if (!rawText.trim()) return { error: "Plak eerst een of meer regels." };

  const result = await importContacts(actor.organizationId, rawText);

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "contacts_imported",
    entityType: "contact",
    entityId: actor.organizationId,
    metadata: { ...result },
  });

  revalidatePath("/contacts");

  const parts = [`${result.imported} contact${result.imported === 1 ? "" : "en"} geïmporteerd.`];
  if (result.skippedOptOut > 0) parts.push(`${result.skippedOptOut} overgeslagen (afgemeld).`);
  if (result.skippedInvalid > 0) parts.push(`${result.skippedInvalid} regel(s) overgeslagen (ongeldig).`);
  return { message: parts.join(" ") };
}

export async function syncOrderContactsAction(
  _prevState: ContactActionState,
  _formData: FormData,
): Promise<ContactActionState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const result = await syncOrderContactsIntoAddressBook(actor.organizationId);

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "contacts_synced_from_orders",
    entityType: "contact",
    entityId: actor.organizationId,
    metadata: { ...result },
  });

  revalidatePath("/contacts");
  return { message: `${result.added} opt-in koper${result.added === 1 ? "" : "s"} in het adresboek bijgewerkt.` };
}
