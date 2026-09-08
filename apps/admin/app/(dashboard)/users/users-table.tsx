"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@lions/ui";
import type { UserRole } from "@lions/db";
import { useBulkSelection } from "@/lib/use-bulk-selection";
import { BulkActionsBar } from "@/lib/bulk-actions-bar";
import { bulkSetUsersActive, bulkDeleteUsers, toggleStaffActive } from "./actions";
import { UserRowForm } from "./user-row-form";

export interface UserRow {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  eventAccess: { eventId: string }[];
}

/** Los i.p.v. inline in de map(): bulkDeleteUsers verwacht een array id's, dus deze knop
 * kan niet als gewone useActionState/FormData-form (zoals DeleteOrderButton) — hij roept
 * de server action rechtstreeks aan met één id erin. */
function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(`Gebruiker "${email}" definitief verwijderen (incl. hun inlog)? Dit kan niet ongedaan worden gemaakt.`)
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await bulkDeleteUsers([userId]);
            if (result.error) setError(result.error);
          });
        }}
      >
        {pending ? "Bezig…" : "Verwijderen"}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Gedeeld door /users (mode="active") en /users/inactief (mode="inactive") — zelfde
 * kolommen, alleen de bulkacties in de werkbalk en de rij-acties verschillen. Zie
 * orders/orders-table.tsx voor hetzelfde patroon bij bestellingen. */
export function UsersTable({
  users,
  events,
  mode,
  currentUserId,
}: {
  users: UserRow[];
  events: { id: string; name: string }[];
  mode: "active" | "inactive";
  currentUserId: string;
}) {
  const { selected, toggle, toggleAll, allSelected, count, selectedIds, clear } = useBulkSelection(
    users.map((u) => u.id),
  );

  const actions =
    mode === "active"
      ? [
          {
            label: `Op inactief zetten (${count})`,
            pendingLabel: "Bezig…",
            variant: "destructive" as const,
            confirm: "Geselecteerde gebruikers op inactief zetten? Ze kunnen dan niet meer inloggen.",
            onRun: async () => {
              const result = await bulkSetUsersActive(selectedIds, false);
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
              const result = await bulkSetUsersActive(selectedIds, true);
              if (!result.error) clear();
              return result;
            },
          },
          {
            label: `Verwijderen (${count})`,
            pendingLabel: "Bezig…",
            variant: "destructive" as const,
            confirm:
              "Geselecteerde gebruikers definitief verwijderen (incl. hun inlog)? Dit kan niet ongedaan worden gemaakt.",
            onRun: async () => {
              const result = await bulkDeleteUsers(selectedIds);
              if (!result.error) clear();
              return result;
            },
          },
        ];

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar count={count} allSelected={allSelected} onToggleAll={toggleAll} actions={actions} />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>E-mailadres</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggle(u.id)}
                      className="size-4 rounded border-input"
                      aria-label={`Selecteer ${u.email}`}
                    />
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <UserRowForm
                      userId={u.id}
                      initialRole={u.role}
                      initialEventIds={u.eventAccess.map((a) => a.eventId)}
                      events={events}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Actief" : "Inactief"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <form action={toggleStaffActive}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="isActive" value={String(u.isActive)} />
                        <Button
                          type="submit"
                          size="sm"
                          variant={u.isActive ? "destructive" : "outline"}
                          disabled={u.isActive && u.id === currentUserId}
                        >
                          {u.isActive ? "Deactiveren" : "Activeren"}
                        </Button>
                      </form>
                      {!u.isActive && u.id !== currentUserId && <DeleteUserButton userId={u.id} email={u.email} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {mode === "active" ? "Nog geen gebruikers." : "Geen inactieve gebruikers."}
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
