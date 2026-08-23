import { prisma, toAmsterdamDatetimeLocalValue } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { EditEventForm } from "./edit-event-form";
import { CreateEventForm } from "./create-event-form";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function EventsPage() {
  const actor = await requireStaffRole(["ADMIN"]);

  const events = await prisma.event.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      {events.map((event) => {
        const theme = isRecord(event.theme) ? event.theme : {};
        return (
          <EditEventForm
            key={event.id}
            event={{
              id: event.id,
              name: event.name,
              slug: event.slug,
              description: event.description ?? "",
              venue: event.venue ?? "",
              startsAt: toAmsterdamDatetimeLocalValue(event.startsAt),
              endsAt: event.endsAt ? toAmsterdamDatetimeLocalValue(event.endsAt) : "",
              status: event.status,
              isVisible: event.isVisible,
              primaryColor: str(theme.primaryColor),
              backgroundColor: str(theme.backgroundColor),
              accentColor: str(theme.accentColor),
              logoUrl: str(theme.logoUrl),
              heroImageUrl: str(theme.heroImageUrl),
              dark: theme.dark === "true",
            }}
          />
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Nieuw event</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEventForm />
        </CardContent>
      </Card>
    </div>
  );
}
