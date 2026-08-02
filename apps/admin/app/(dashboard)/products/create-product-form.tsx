"use client";

import { useActionState } from "react";
import { createProduct, type ProductActionState } from "./actions";

const initialState: ProductActionState = {};

export function CreateProductForm({ events }: { events: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createProduct, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
      <select name="eventId" required defaultValue="">
        <option value="" disabled>
          Evenement…
        </option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>
      <select name="kind" defaultValue="MERCHANDISE">
        <option value="TICKET">Ticket</option>
        <option value="MERCHANDISE">Merchandise</option>
      </select>
      <input type="text" name="name" placeholder="Naam (bv. T-shirt)" style={{ width: "10rem" }} required />
      <input type="text" name="description" placeholder="Omschrijving (optioneel)" style={{ width: "12rem" }} />
      <label>
        € <input type="number" name="priceEuros" step="0.01" min="0.01" style={{ width: "6rem" }} required />
      </label>
      <label>
        Aantal <input type="number" name="totalStock" min="0" style={{ width: "5rem" }} required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Toevoegen…" : "+ Nieuw product"}
      </button>
      {state.error && <p style={{ color: "crimson", margin: 0 }}>{state.error}</p>}
    </form>
  );
}
