"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@lions/ui";
import { updateContact, type ContactActionState } from "../actions";

const initialState: ContactActionState = {};

export function EditContactForm({ contact }: { contact: { id: string; name: string; email: string } }) {
  const [state, formAction, pending] = useActionState(updateContact, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={contact.id} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Naam</Label>
        <Input id="name" type="text" name="name" defaultValue={contact.name} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="email">E-mailadres</Label>
        <Input id="email" type="email" name="email" defaultValue={contact.email} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Bezig…" : "Opslaan"}
        </Button>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}
