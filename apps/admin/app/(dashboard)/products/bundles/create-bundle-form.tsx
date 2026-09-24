"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button, Input, Label, Select } from "@lions/ui";
import { ComponentPicker } from "./component-picker";
import { createBundle, type BundleActionState } from "./actions";

const initialState: BundleActionState = {};

interface EventOption {
  id: string;
  name: string;
  products: { id: string; name: string; kind: string }[];
}

export function CreateBundleForm({ events }: { events: EventOption[] }) {
  const [state, formAction, pending] = useActionState(createBundle, initialState);
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const products = events.find((e) => e.id === eventId)?.products ?? [];

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="eventId">Evenement</Label>
        <Select
          id="eventId"
          name="eventId"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-48"
        >
          <option value="" disabled>
            Evenement…
          </option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Naam</Label>
        <Input id="name" type="text" name="name" placeholder="bv. Ticket + Glowstick" required className="w-48" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="description">Omschrijving</Label>
        <Input id="description" type="text" name="description" placeholder="Optioneel" className="w-48" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="priceEuros">Prijs (€)</Label>
        <Input id="priceEuros" type="number" name="priceEuros" step="0.01" min="0.01" required className="w-24" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="image">Foto</Label>
        <input id="image" type="file" name="image" accept="image/*" className="w-48 text-sm" />
      </div>

      <ComponentPicker key={eventId} availableProducts={products} />

      <Button type="submit" disabled={pending || products.length === 0}>
        {pending ? "Toevoegen…" : "+ Nieuwe combi"}
      </Button>
      {state.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
