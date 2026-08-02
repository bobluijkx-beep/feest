"use client";

import { useActionState } from "react";
import { updateProduct, deleteProduct, type ProductActionState } from "./actions";

const initialState: ProductActionState = {};

interface Product {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  priceCents: number;
  totalStock: number;
  reservedStock: number;
  soldStock: number;
  isActive: boolean;
  eventName: string;
}

export function ProductRowForm({ product }: { product: Product }) {
  const [updateState, updateAction, updatePending] = useActionState(updateProduct, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteProduct, initialState);
  const committed = product.reservedStock + product.soldStock;

  return (
    <tr style={{ borderTop: "1px solid #ddd" }}>
      <td colSpan={7} style={{ padding: "0.75rem 0" }}>
        <p style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", color: "#555" }}>Evenement: {product.eventName}</p>
        <form action={updateAction} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <input type="hidden" name="id" value={product.id} />
          <select name="kind" defaultValue={product.kind}>
            <option value="TICKET">Ticket</option>
            <option value="MERCHANDISE">Merchandise</option>
          </select>
          <input type="text" name="name" defaultValue={product.name} style={{ width: "10rem" }} required />
          <input
            type="text"
            name="description"
            defaultValue={product.description ?? ""}
            placeholder="Omschrijving (optioneel)"
            style={{ width: "12rem" }}
          />
          <label>
            €{" "}
            <input
              type="number"
              name="priceEuros"
              defaultValue={(product.priceCents / 100).toFixed(2)}
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
              defaultValue={product.totalStock}
              min={committed}
              style={{ width: "5rem" }}
              required
            />
          </label>
          <span style={{ fontSize: "0.85rem", color: "#555" }}>({committed} gereserveerd/verkocht)</span>
          <label>
            <input type="checkbox" name="isActive" defaultChecked={product.isActive} /> Actief
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
            if (!window.confirm(`Product "${product.name}" verwijderen?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={product.id} />
          <button type="submit" disabled={deletePending}>
            {deletePending ? "Bezig…" : "Verwijderen"}
          </button>
        </form>
        {deleteState.error && <p style={{ color: "crimson", margin: "0.25rem 0 0" }}>{deleteState.error}</p>}
      </td>
    </tr>
  );
}
