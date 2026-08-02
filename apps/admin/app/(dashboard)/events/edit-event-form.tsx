"use client";

import { useActionState } from "react";
import { updateEvent, type EventActionState } from "./actions";
import { EventFormFields } from "./event-form-fields";

const initialState: EventActionState = {};

interface EventDefaults {
  id: string;
  name: string;
  slug: string;
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  status: string;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  logoUrl: string;
}

export function EditEventForm({ event }: { event: EventDefaults }) {
  const [state, formAction, pending] = useActionState(updateEvent, initialState);

  return (
    <form action={formAction} style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "1rem" }}>
      <input type="hidden" name="id" value={event.id} />
      <EventFormFields defaults={event} />
      <button type="submit" disabled={pending} style={{ marginTop: "0.75rem" }}>
        {pending ? "Opslaan…" : "Opslaan"}
      </button>
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
      {state.success && <p style={{ color: "green" }}>Opgeslagen.</p>}
    </form>
  );
}
