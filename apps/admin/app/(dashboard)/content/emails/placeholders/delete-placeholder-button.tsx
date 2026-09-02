"use client";

import { useActionState } from "react";
import { Button } from "@lions/ui";
import { deleteCustomPlaceholder, type SavePlaceholderState } from "./actions";

const initialState: SavePlaceholderState = {};

export function DeletePlaceholderButton({ id, keyValue }: { id: string; keyValue: string }) {
  const [state, formAction, pending] = useActionState(deleteCustomPlaceholder, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Placeholder {{${keyValue}}} definitief verwijderen?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? "Bezig…" : "Verwijderen"}
      </Button>
      {state.error && <div className="mt-1 text-xs text-destructive">{state.error}</div>}
    </form>
  );
}
