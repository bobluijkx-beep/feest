"use client";

import { useActionState } from "react";
import { deleteOrder, type OrderActionState } from "./actions";

const initialState: OrderActionState = {};

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(deleteOrder, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Deze testorder en bijbehorende tickets definitief verwijderen? Dit kan niet ongedaan worden gemaakt.",
          )
        ) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline-block" }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <button type="submit" disabled={pending}>
        {pending ? "Bezig…" : "Verwijderen"}
      </button>
      {state.error && <div style={{ color: "crimson", fontSize: "0.85rem" }}>{state.error}</div>}
    </form>
  );
}
