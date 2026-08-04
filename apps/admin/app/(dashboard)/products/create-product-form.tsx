"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@lions/ui";
import { createProduct, type ProductActionState } from "./actions";

const initialState: ProductActionState = {};

export function CreateProductForm({ events }: { events: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createProduct, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="eventId">Evenement</Label>
        <Select id="eventId" name="eventId" required defaultValue="" className="w-48">
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
        <Label htmlFor="kind">Soort</Label>
        <Select id="kind" name="kind" defaultValue="MERCHANDISE" className="w-36">
          <option value="TICKET">Ticket</option>
          <option value="MERCHANDISE">Product</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Naam</Label>
        <Input id="name" type="text" name="name" placeholder="bv. T-shirt" required className="w-48" />
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
        <Label htmlFor="totalStock">Aantal</Label>
        <Input id="totalStock" type="number" name="totalStock" min="0" required className="w-20" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Toevoegen…" : "+ Nieuw product"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
