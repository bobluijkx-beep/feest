"use client";

import { useActionState } from "react";
import { updateTicketType, deleteTicketType, type TicketTypeActionState } from "./actions";

const initialState: TicketTypeActionState = {};

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  totalStock: number;
  reservedStock: number;
  soldStock: number;
  isActive: boolean;
}

export function TicketTypeRowForm({ ticketType }: { ticketType: TicketType }) {
  const [updateState, updateAction, updatePending] = useActionState(updateTicketType, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTicketType, initialState);
  const committed = ticketType.reservedStock + ticketType.soldStock;

  return (
    <tr style={{ borderTop: "1px solid #ddd" }}>
      <td colSpan={6} style={{ padding: "0.75rem 0" }}>
        <form action={updateAction} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <input type="hidden" name="id" value={ticketType.id} />
          <input type="text" name="name" defaultValue={ticketType.name} style={{ width: "10rem" }} required />
          <input
            type="text"
            name="description"
            defaultValue={ticketType.description ?? ""}
            placeholder="Omschrijving (optioneel)"
            style={{ width: "12rem" }}
          />
          <label>
            €{" "}
            <input
              type="number"
              name="priceEuros"
              defaultValue={(ticketType.priceCents / 100).toFixed(2)}
              step="0.01"
              min="0.01"
              style={{ width: "6rem" }}
              required
            />
          </label>
          <label>
            Aantal{" "}
            <input
              type="number"
              name="totalStock"
              defaultValue={ticketType.totalStock}
              min={committed}
              style={{ width: "5rem" }}
              required
            />
          </label>
          <span style={{ fontSize: "0.85rem", color: "#555" }}>
            ({committed} gereserveerd/verkocht)
          </span>
          <label>
            <input type="checkbox" name="isActive" defaultChecked={ticketType.isActive} /> Actief
          </label>
          <button type="submit" disabled={updatePending}>
            {updatePending ? "Opslaan…" : "Opslaan"}
          </button>
        </form>
        {updateState.error && <p style={{ color: "crimson", margin: "0.25rem 0 0" }}>{updateState.error}</p>}

        <form
          action={deleteAction}
          style={{ marginTop: "0.5rem" }}
          onSubmit={(e) => {
            if (!window.confirm(`Ticketsoort "${ticketType.name}" verwijderen?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={ticketType.id} />
          <button type="submit" disabled={deletePending}>
            {deletePending ? "Bezig…" : "Verwijderen"}
          </button>
        </form>
        {deleteState.error && <p style={{ color: "crimson", margin: "0.25rem 0 0" }}>{deleteState.error}</p>}
      </td>
    </tr>
  );
}
