import Link from "next/link";
import { getRankedSongRequests } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { getSelectedEvent } from "@/lib/selected-event";
import { EventTabs } from "@/lib/event-tabs";
import { SongRequestsTable } from "../song-requests-table";

/** Afdeling "Inactief": nummers die met "Op inactief zetten" uit de ranglijst zijn gehaald
 * (bv. al gedraaid op het feest). Alleen hiervandaan kan een verzoek weer actief gemaakt
 * worden, of — uitsluitend ADMIN — definitief verwijderd worden (ook in bulk, zie
 * SongRequestsTable/actions.ts). Zelfde patroon als /orders/inactief. */
export default async function InactiveSongRequestsPage({
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

  const ranking = await getRankedSongRequests(event.id, false);

  return (
    <div className="flex flex-col gap-4">
      <EventTabs events={events} selectedId={event.id} basePath="/song-requests/inactief" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">Inactieve muziekverzoeken</h1>
          <p className="text-sm text-muted-foreground">
            Verborgen uit de ranglijst en de DJ-pagina. Definitief verwijderen kan alleen hier.
          </p>
        </div>
        <Link
          href={`/song-requests?eventId=${event.id}`}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          ← Terug naar de ranglijst
        </Link>
      </div>
      <SongRequestsTable ranking={ranking} mode="inactive" canDelete={actor.role === "ADMIN"} />
    </div>
  );
}
