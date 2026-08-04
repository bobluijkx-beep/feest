"use client";

import { useActionState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@lions/ui";
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
  isVisible: boolean;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  logoUrl: string;
}

export function EditEventForm({ event }: { event: EventDefaults }) {
  const [state, formAction, pending] = useActionState(updateEvent, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{event.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={event.id} />
          <EventFormFields defaults={event} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Opslaan…" : "Opslaan"}
            </Button>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            {state.success && <p className="text-sm text-primary">Opgeslagen.</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
