"use client";

import { useActionState } from "react";
import { Button } from "@lions/ui";
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
    >
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Bezig…" : "Terugbetalen"}
      </Button>
      {state.error && <div className="mt-1 text-xs text-destructive">{state.error}</div>}
      {state.success && <div className="mt-1 text-xs text-primary">Terugbetaald.</div>}
    </form>
  );
}
