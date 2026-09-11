import Link from "next/link";
import { getRankedSongRequests, buildDjSetlistUrl } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { getSelectedEvent } from "@/lib/selected-event";
import { EventTabs } from "@/lib/event-tabs";
import { SongRequestsTable } from "./song-requests-table";
import { DjLink } from "./dj-link";

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

  const [ranking, inactiveRanking] = await Promise.all([
    getRankedSongRequests(event.id, true),
    getRankedSongRequests(event.id, false),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <EventTabs events={events} selectedId={event.id} basePath="/song-requests" />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Event: {event.name}</p>
        <Link
          href={`/song-requests/inactief?eventId=${event.id}`}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Inactieve verzoeken bekijken{inactiveRanking.length > 0 ? ` (${inactiveRanking.length})` : ""}
        </Link>
      </div>

      <DjLink url={buildDjSetlistUrl(event.id)} />

      <SongRequestsTable ranking={ranking} mode="active" canDelete={false} />
    </div>
  );
}
