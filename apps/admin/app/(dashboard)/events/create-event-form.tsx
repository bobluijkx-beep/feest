"use client";

import { useActionState } from "react";
import { createEvent, type EventActionState } from "./actions";
import { EventFormFields } from "./event-form-fields";

const initialState: EventActionState = {};

export function CreateEventForm() {
  const [state, formAction, pending] = useActionState(createEvent, initialState);

  return (
    <form action={formAction} style={{ border: "1px solid #ddd", padding: "1rem" }}>
      <EventFormFields />
      <button type="submit" disabled={pending} style={{ marginTop: "0.75rem" }}>
        {pending ? "Aanmaken…" : "+ Nieuw event"}
      </button>
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
      {state.success && <p style={{ color: "green" }}>Aangemaakt.</p>}
    </form>
  );
}
