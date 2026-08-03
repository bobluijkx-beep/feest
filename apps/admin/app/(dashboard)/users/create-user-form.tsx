"use client";

import { useActionState } from "react";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Select } from "@lions/ui";
import { createStaffUser, type CreateStaffUserState } from "./actions";

const initialState: CreateStaffUserState = {};

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createStaffUser, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuwe gebruiker</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="email">E-mailadres</Label>
            <Input id="email" type="email" name="email" required className="w-64" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="role">Rol</Label>
            <Select id="role" name="role" required defaultValue="EDITOR" className="w-40">
              <option value="ADMIN">ADMIN</option>
              <option value="FINANCE">FINANCE</option>
              <option value="EDITOR">EDITOR</option>
              <option value="DOOR_STAFF">DOOR_STAFF</option>
            </Select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Bezig…" : "Aanmaken"}
          </Button>
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
