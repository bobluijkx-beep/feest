"use client";

import { useActionState } from "react";
import { createTicketType, type TicketTypeActionState } from "./actions";

const initialState: TicketTypeActionState = {};

export function CreateTicketTypeForm() {
  const [state, formAction, pending] = useActionState(createTicketType, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
      <input type="text" name="name" placeholder="Naam (bv. VIP)" style={{ width: "10rem" }} required />
      <input type="text" name="description" placeholder="Omschrijving (optioneel)" style={{ width: "12rem" }} />
      <label>
        € <input type="number" name="priceEuros" step="0.01" min="0.01" style={{ width: "6rem" }} required />
      </label>
      <label>
        Aantal <input type="number" name="totalStock" min="0" style={{ width: "5rem" }} required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Toevoegen…" : "+ Nieuwe ticketsoort"}
      </button>
      {state.error && <p style={{ color: "crimson", margin: 0 }}>{state.error}</p>}
    </form>
  );
}
