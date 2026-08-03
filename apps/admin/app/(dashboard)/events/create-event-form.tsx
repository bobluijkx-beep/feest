"use client";

import { useActionState } from "react";
import { Button } from "@lions/ui";
import { createEvent, type EventActionState } from "./actions";
import { EventFormFields } from "./event-form-fields";

const initialState: EventActionState = {};

export function CreateEventForm() {
  const [state, formAction, pending] = useActionState(createEvent, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <EventFormFields />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Aanmaken…" : "+ Nieuw event"}
        </Button>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.success && <p className="text-sm text-primary">Aangemaakt.</p>}
      </div>
    </form>
  );
}
