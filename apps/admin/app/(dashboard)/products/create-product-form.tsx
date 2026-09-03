"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button, Input, Label, Select } from "@lions/ui";
import { HtmlEditor } from "../content/emails/html-editor";
import { createProduct, type ProductActionState } from "./actions";

const initialState: ProductActionState = {};

export function CreateProductForm({ events }: { events: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  const [kind, setKind] = useState("MERCHANDISE");
  const [description, setDescription] = useState("");
  const isDonation = kind === "DONATION";

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
        <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="w-36">
          <option value="TICKET">Ticket</option>
          <option value="MERCHANDISE">Product</option>
          <option value="DONATION">Donatie</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Naam</Label>
        <Input id="name" type="text" name="name" placeholder="bv. T-shirt" required className="w-48" />
      </div>

      {isDonation ? (
        <>
          {/* Donatie heeft geen vaste prijs/voorraad: 3 standaardbedragen i.p.v. Prijs, en
              helemaal geen Aantal-veld (zie DONATION_UNLIMITED_STOCK, packages/core). */}
          <div className="flex w-full flex-col gap-1">
            <Label htmlFor="description">Tekst boven de bedragen</Label>
            <HtmlEditor value={description} onChange={setDescription} rows={3} />
            <input type="hidden" name="description" value={description} />
          </div>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col gap-1">
              <Label htmlFor={`donationPreset${n}Euros`}>Bedrag {n} (€)</Label>
              <Input
                id={`donationPreset${n}Euros`}
                type="number"
                name={`donationPreset${n}Euros`}
                step="0.01"
                min="2.50"
                required
                className="w-24"
              />
            </div>
          ))}
        </>
      ) : (
        <>
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
        </>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="image">Foto</Label>
        <input id="image" type="file" name="image" accept="image/*" className="w-48 text-sm" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Toevoegen…" : "+ Nieuw product"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
