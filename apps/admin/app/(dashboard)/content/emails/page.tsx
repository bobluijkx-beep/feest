import Link from "next/link";
import { prisma } from "@lions/core";
import type { EmailTemplateType } from "@lions/db";
import { requireStaffRole } from "@/lib/require-role";

const TYPES: { type: EmailTemplateType; label: string }[] = [
  { type: "ORDER_CONFIRMATION", label: "Orderbevestiging" },
  { type: "PAYMENT_FAILED", label: "Betaling mislukt / geannuleerd" },
  { type: "PAYMENT_REMINDER", label: "Betaalherinnering (nog niet actief verstuurd)" },
  { type: "CANCELLED", label: "Bestelling geannuleerd" },
];

export default async function EmailTemplatesPage() {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const event = await prisma.event.findFirst({ where: { organizationId: actor.organizationId } });

  if (!event) {
    return (
      <main>
        <h1>E-mailtemplates</h1>
        <p>Nog geen event aangemaakt.</p>
      </main>
    );
  }

  const templates = await prisma.emailTemplate.findMany({ where: { eventId: event.id, language: "nl" } });
  const customTypes = new Set(templates.map((t) => t.type));

  return (
    <main>
      <h1>E-mailtemplates</h1>
      <p>Event: {event.name}</p>
      <ul>
        {TYPES.map(({ type, label }) => (
          <li key={type}>
            <Link href={`/content/emails/${type}`}>{label}</Link> —{" "}
            {customTypes.has(type) ? "aangepast" : "standaard"}
          </li>
        ))}
      </ul>
    </main>
  );
}
