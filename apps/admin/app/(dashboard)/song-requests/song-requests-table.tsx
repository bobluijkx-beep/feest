"use client";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@lions/ui";
import { useBulkSelection } from "@/lib/use-bulk-selection";
import { BulkActionsBar } from "@/lib/bulk-actions-bar";
import { bulkSetSongRequestsVisible, bulkDeleteSongRequests } from "./actions";
import type { RankedSongRequest } from "@lions/core";

/** Gedeeld door /song-requests (mode="active") en /song-requests/inactief (mode="inactive")
 * — zelfde patroon als OrdersTable, alleen selecteert een rij hier een hele ranglijst-groep
 * (RankedSongRequest.requestIds), niet één losse database-rij. */
export function SongRequestsTable({
  ranking,
  mode,
  canDelete,
}: {
  ranking: RankedSongRequest[];
  mode: "active" | "inactive";
  canDelete: boolean;
}) {
  const { selected, toggle, toggleAll, allSelected, count, selectedIds, clear } = useBulkSelection(
    ranking.map((r) => r.groupKey),
  );

  const selectedRequestIds = ranking.filter((r) => selectedIds.includes(r.groupKey)).flatMap((r) => r.requestIds);

  const actions =
    mode === "active"
      ? [
          {
            label: `Op inactief zetten (${count})`,
            pendingLabel: "Bezig…",
            variant: "destructive" as const,
            confirm:
              "Geselecteerde nummers op inactief zetten? Ze verdwijnen dan uit deze ranglijst en de DJ-pagina (verplaatst naar de afdeling Inactief).",
            onRun: async () => {
              const result = await bulkSetSongRequestsVisible(selectedRequestIds, false);
              if (!result.error) clear();
              return result;
            },
          },
        ]
      : [
          {
            label: `Weer actief maken (${count})`,
            pendingLabel: "Bezig…",
            onRun: async () => {
              const result = await bulkSetSongRequestsVisible(selectedRequestIds, true);
              if (!result.error) clear();
              return result;
            },
          },
          ...(canDelete
            ? [
                {
                  label: `Verwijderen (${count})`,
                  pendingLabel: "Bezig…",
                  variant: "destructive" as const,
                  confirm: "Geselecteerde verzoeken definitief verwijderen? Dit kan niet ongedaan worden gemaakt.",
                  onRun: async () => {
                    const result = await bulkDeleteSongRequests(selectedRequestIds);
                    if (!result.error) clear();
                    return result;
                  },
                },
              ]
            : []),
        ];

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar count={count} allSelected={allSelected} onToggleAll={toggleAll} actions={actions} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead className="w-12">#</TableHead>
            <TableHead>Artiest</TableHead>
            <TableHead>Nummer</TableHead>
            <TableHead className="text-right">Aantal</TableHead>
            <TableHead>Aangevraagd door</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranking.map((row, index) => (
            <TableRow key={row.groupKey}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.has(row.groupKey)}
                  onChange={() => toggle(row.groupKey)}
                  className="size-4 rounded border-input"
                  aria-label={`Selecteer ${row.artist} - ${row.title}`}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">{row.artist}</TableCell>
              <TableCell>{row.title}</TableCell>
              <TableCell className="text-right tabular-nums">{row.count}</TableCell>
              <TableCell className="text-muted-foreground">{row.requesterNames.join(", ")}</TableCell>
            </TableRow>
          ))}
          {ranking.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {mode === "active" ? "Nog geen muziekverzoeken." : "Geen inactieve verzoeken."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
