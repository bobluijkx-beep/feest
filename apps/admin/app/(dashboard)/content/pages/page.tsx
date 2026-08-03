import Link from "next/link";
import { prisma } from "@lions/core";
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, buttonVariants } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { getSelectedEvent } from "@/lib/selected-event";
import { EventTabs } from "@/lib/event-tabs";

export default async function PageBlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { eventId } = await searchParams;
  const { events, selected: event } = await getSelectedEvent(actor.organizationId, eventId);

  if (!event) {
    return <p className="text-sm text-muted-foreground">Nog geen event aangemaakt.</p>;
  }

  const blocks = await prisma.pageBlock.findMany({ where: { eventId: event.id }, orderBy: { order: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <EventTabs events={events} selectedId={event.id} basePath="/content/pages" />
        <Link href={`/content/pages/new?eventId=${event.id}`} className={buttonVariants({ size: "sm" })}>
          + Blok toevoegen
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Volgorde</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.type}</TableCell>
                  <TableCell>{b.order}</TableCell>
                  <TableCell>
                    <Badge variant={b.isPublished ? "default" : "secondary"}>
                      {b.isPublished ? "Gepubliceerd" : "Concept"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/content/pages/${b.id}`} className="text-sm text-primary hover:underline">
                      Bewerken
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {blocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nog geen blokken.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
