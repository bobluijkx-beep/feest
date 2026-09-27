import {
  getMollieMode,
  hasMollieApiKey,
  getContactFormRecipients,
  getCartReminderText,
  getWhatsappShareMessageTemplate,
} from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { MollieSettingsForm } from "./mollie-settings-form";
import { ContactFormRecipientsForm } from "./contact-form-recipients-form";
import { CartReminderForm } from "./cart-reminder-form";
import { WhatsappShareForm } from "./whatsapp-share-form";

export default async function SettingsPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const [mode, hasTestKey, hasLiveKey, contactFormRecipients, cartReminderText, whatsappShareMessage] =
    await Promise.all([
      getMollieMode(actor.organizationId),
      hasMollieApiKey(actor.organizationId, "test"),
      hasMollieApiKey(actor.organizationId, "live"),
      getContactFormRecipients(actor.organizationId),
      getCartReminderText(actor.organizationId),
      getWhatsappShareMessageTemplate(actor.organizationId),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <MollieSettingsForm mode={mode} hasTestKey={hasTestKey} hasLiveKey={hasLiveKey} />
      <ContactFormRecipientsForm recipients={contactFormRecipients} />
      <CartReminderForm text={cartReminderText} />
      <WhatsappShareForm text={whatsappShareMessage} />
    </div>
  );
}
