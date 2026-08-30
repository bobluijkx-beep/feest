import { prisma, scopeEventsForActor, buildSegmentRecipients } from "@lions/core";
import type { ProductKind } from "@lions/db";
import { Card, CardHeader, CardTitle, CardContent, Select, Button } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { parseSegmentFromFormData } from "../segment-form";
import { CampaignComposeForm } from "../campaign-compose-form";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; productKinds?: string | string[]; checkedInFilter?: string }>;
}) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const params = await searchParams;

  const allEvents = await prisma.event.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { startsAt: "asc" },
    select: { id: true, name: true },
  });
  const events = await scopeEventsForActor(actor, allEvents);

  const formData = new FormData();
  if (params.eventId) formData.set("eventId", params.eventId);
  const productKindsParam = params.productKinds
    ? Array.isArray(params.productKinds)
      ? params.productKinds
      : [params.productKinds]
    : [];
  for (const kind of productKindsParam) formData.append("productKinds", kind);
  if (params.checkedInFilter) formData.set("checkedInFilter", params.checkedInFilter);

  const segment = parseSegmentFromFormData(formData);
  const eventSelected = events.some((e) => e.id === segment.eventId);

  const recipientCount = eventSelected ? (await buildSegmentRecipients(segment)).length : 0;

  const layouts = await prisma.emailLayout.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, bodyHtml: true, isDefault: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Doelgroep</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="eventId" className="text-sm font-medium">
                Event
              </label>
              <Select id="eventId" name="eventId" defaultValue={segment.eventId} className="w-64">
                <option value="">Kies een event…</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </Select>
            </div>
            <fieldset className="flex flex-col gap-1">
              <legend className="text-sm font-medium">Producttype</legend>
              <div className="flex gap-3">
                {(["TICKET", "MERCHANDISE"] as ProductKind[]).map((kind) => (
                  <label key={kind} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="productKinds"
                      value={kind}
                      defaultChecked={(segment.productKinds ?? []).includes(kind)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {kind === "TICKET" ? "Ticket" : "Product"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-1">
              <label htmlFor="checkedInFilter" className="text-sm font-medium">
                Check-in-status
              </label>
              <Select id="checkedInFilter" name="checkedInFilter" defaultValue={segment.checkedInFilter} className="w-48">
                <option value="ANY">Iedereen</option>
                <option value="NOT_CHECKED_IN">Nog niet ingecheckt</option>
                <option value="CHECKED_IN">Al ingecheckt</option>
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Doelgroep tonen
            </Button>
          </form>
        </CardContent>
      </Card>

      {eventSelected ? (
        <Card>
          <CardHeader>
            <CardTitle>Mailing opstellen ({recipientCount} ontvangers)</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignComposeForm segment={segment} recipientCount={recipientCount} layouts={layouts} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Kies eerst een event om de doelgroep te bepalen.</p>
      )}
    </div>
  );
}
