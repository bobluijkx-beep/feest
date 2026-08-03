"use client";

import { useActionState } from "react";
import { Button } from "@lions/ui";
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
    >
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? "Bezig…" : "Verwijderen"}
      </Button>
      {state.error && <div className="mt-1 text-xs text-destructive">{state.error}</div>}
    </form>
  );
}
