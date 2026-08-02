"use client";

import { useActionState } from "react";
import { refundOrder, type OrderActionState } from "./actions";

const initialState: OrderActionState = {};

export function RefundButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(refundOrder, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Deze bestelling terugbetalen via Mollie? Dit kan niet ongedaan worden gemaakt.")) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline-block" }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <button type="submit" disabled={pending}>
        {pending ? "Bezig…" : "Terugbetalen"}
      </button>
      {state.error && <div style={{ color: "crimson", fontSize: "0.85rem" }}>{state.error}</div>}
      {state.success && <div style={{ color: "green", fontSize: "0.85rem" }}>Terugbetaald.</div>}
    </form>
  );
}
