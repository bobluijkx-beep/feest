import Link from "next/link";
import { prisma } from "@lions/core";
import type { EmailTemplateType } from "@lions/db";
import { requireStaffRole } from "@/lib/require-role";
import { getSelectedEvent } from "@/lib/selected-event";
import { EventTabs } from "@/lib/event-tabs";

const TYPES: { type: EmailTemplateType; label: string }[] = [
  { type: "ORDER_CONFIRMATION", label: "Orderbevestiging" },
  { type: "PAYMENT_FAILED", label: "Betaling mislukt / geannuleerd" },
  { type: "PAYMENT_REMINDER", label: "Betaalherinnering (nog niet actief verstuurd)" },
  { type: "CANCELLED", label: "Bestelling geannuleerd" },
];

export default async function EmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { eventId } = await searchParams;
  const { events, selected: event } = await getSelectedEvent(actor.organizationId, eventId);

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
      <EventTabs events={events} selectedId={event.id} basePath="/content/emails" />
      <p>Event: {event.name}</p>
      <ul>
        {TYPES.map(({ type, label }) => (
          <li key={type}>
            <Link href={`/content/emails/${type}?eventId=${event.id}`}>{label}</Link> —{" "}
            {customTypes.has(type) ? "aangepast" : "standaard"}
          </li>
        ))}
      </ul>
    </main>
  );
}
