"use client";

import { useActionState } from "react";
import { Button } from "@lions/ui";
import { setOrderVisible, type OrderActionState } from "./actions";

const initialState: OrderActionState = {};

export function ReactivateOrderButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(setOrderVisible, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="isVisible" value="true" />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Bezig…" : "Weer actief maken"}
      </Button>
      {state.error && <div className="mt-1 text-xs text-destructive">{state.error}</div>}
    </form>
  );
}
