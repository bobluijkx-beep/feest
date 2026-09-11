import { getRankedSongRequests } from "@lions/core";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { getSelectedEvent } from "@/lib/selected-event";
import { EventTabs } from "@/lib/event-tabs";

export default async function SongRequestsPage({
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

  const ranking = await getRankedSongRequests(event.id);

  return (
    <div className="flex flex-col gap-4">
      <EventTabs events={events} selectedId={event.id} basePath="/song-requests" />
      <p className="text-sm text-muted-foreground">Event: {event.name}</p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Artiest</TableHead>
            <TableHead>Nummer</TableHead>
            <TableHead className="text-right">Aantal</TableHead>
            <TableHead>Aangevraagd door</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranking.map((row, index) => (
            <TableRow key={`${row.artist}|${row.title}`}>
              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">{row.artist}</TableCell>
              <TableCell>{row.title}</TableCell>
              <TableCell className="text-right tabular-nums">{row.count}</TableCell>
              <TableCell className="text-muted-foreground">{row.requesterNames.join(", ")}</TableCell>
            </TableRow>
          ))}
          {ranking.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nog geen muziekverzoeken.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
