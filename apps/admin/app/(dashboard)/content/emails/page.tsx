import Link from "next/link";
import { prisma } from "@lions/core";
import type { EmailTemplateType } from "@lions/db";
import { Card, CardContent, Badge, buttonVariants } from "@lions/ui";
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
  const { events, selected: event } = await getSelectedEvent(actor, eventId);

  if (!event) {
    return <p className="text-sm text-muted-foreground">Nog geen event aangemaakt.</p>;
  }

  const templates = await prisma.emailTemplate.findMany({ where: { eventId: event.id, language: "nl" } });
  const customTypes = new Set(templates.map((t) => t.type));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <EventTabs events={events} selectedId={event.id} basePath="/content/emails" />
        <Link href="/content/emails/layouts" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Lay-outs beheren
        </Link>
      </div>
      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {TYPES.map(({ type, label }) => (
            <Link
              key={type}
              href={`/content/emails/${type}?eventId=${event.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50"
            >
              <span>{label}</span>
              <Badge variant={customTypes.has(type) ? "default" : "outline"}>
                {customTypes.has(type) ? "aangepast" : "standaard"}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
