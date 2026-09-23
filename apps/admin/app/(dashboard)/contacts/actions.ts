"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, importContacts, syncOrderContactsIntoAddressBook, logAudit } from "@lions/core";
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

/** Bewerkt naam/e-mailadres van één contact. E-mailadres wijzigen kan botsen met een ander
 * bestaand contact van dezelfde organisatie (uniek per organizationId+email) — dan een
 * duidelijke foutmelding i.p.v. een kale Prisma-crash. */
export async function updateContact(_prevState: ContactActionState, formData: FormData): Promise<ContactActionState> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!name) return { error: "Vul een naam in." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Vul een geldig e-mailadres in." };

  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== actor.organizationId) return { error: "Contact niet gevonden." };

  const duplicate = await prisma.contact.findUnique({
    where: { organizationId_email: { organizationId: actor.organizationId, email } },
  });
  if (duplicate && duplicate.id !== id) {
    return { error: `Er bestaat al een contact met dit e-mailadres (${duplicate.name}).` };
  }

  await prisma.contact.update({ where: { id }, data: { name, email } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "contact_updated",
    entityType: "contact",
    entityId: id,
    metadata: { name, email },
  });

  redirect("/contacts");
}

/** Zelfde patroon als reactivateEmailSubscription in orders/actions.ts. */
export async function reactivateContact(formData: FormData): Promise<void> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;

  await prisma.emailOptOut.deleteMany({ where: { email: { equals: email, mode: "insensitive" } } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "email_optout_cleared",
    entityType: "email_opt_out",
    entityId: email,
  });

  revalidatePath("/contacts");
}
