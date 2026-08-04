"use client";

import { useActionState, useState } from "react";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Select } from "@lions/ui";
import { createStaffUser, type CreateStaffUserState } from "./actions";
import type { UserRole } from "@lions/db";

const initialState: CreateStaffUserState = {};

const EVENT_SCOPED_ROLES: UserRole[] = ["EDITOR", "DOOR_STAFF"];

export function CreateUserForm({ events }: { events: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createStaffUser, initialState);
  const [role, setRole] = useState<UserRole>("EDITOR");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuwe gebruiker</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="email">E-mailadres</Label>
              <Input id="email" type="email" name="email" required className="w-64" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="role">Rol</Label>
              <Select
                id="role"
                name="role"
                required
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-40"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="FINANCE">FINANCE</option>
                <option value="EDITOR">EDITOR</option>
                <option value="DOOR_STAFF">DOOR_STAFF</option>
              </Select>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Bezig…" : "Aanmaken"}
            </Button>
          </div>

          {EVENT_SCOPED_ROLES.includes(role) && (
            <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-medium text-muted-foreground">Toegang tot events</legend>
              <div className="flex flex-wrap gap-3">
                {events.map((event) => (
                  <label key={event.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="eventIds" value={event.id} className="h-4 w-4 rounded border-input" />
                    {event.name}
                  </label>
                ))}
                {events.length === 0 && <p className="text-sm text-muted-foreground">Nog geen events.</p>}
              </div>
            </fieldset>
          )}
        </form>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        {state.tempPassword && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
            <p>
              Account voor <strong>{state.createdEmail}</strong> aangemaakt. Tijdelijk wachtwoord (wordt maar één keer
              getoond, geef dit veilig door):
            </p>
            <code className="mt-1 block font-mono text-sm">{state.tempPassword}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
