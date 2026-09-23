"use client";

import { useActionState } from "react";
import { Button, Label, Textarea } from "@lions/ui";
import { importContactsAction, syncOrderContactsAction, type ContactActionState } from "./actions";

const initialState: ContactActionState = {};

export function SyncOrderContactsForm() {
  const [state, formAction, pending] = useActionState(syncOrderContactsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Haalt iedereen op die ooit een betaalde bestelling heeft geplaatst (bij dit of een eerder event) en zich niet
        heeft afgemeld voor mailings.
      </p>
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Bezig…" : "Ververs vanuit bestellingen"}
        </Button>
      </div>
      {state.message && <p className="text-sm text-primary">{state.message}</p>}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function ImportContactsForm() {
  const [state, formAction, pending] = useActionState(importContactsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Label htmlFor="rows">Eén contact per regel: Naam,e-mailadres</Label>
      <Textarea
        id="rows"
        name="rows"
        rows={8}
        placeholder={"Jan Jansen,jan@voorbeeld.nl\nPiet Pietersen,piet@voorbeeld.nl"}
        className="font-mono text-sm"
      />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Bezig…" : "Importeren"}
        </Button>
      </div>
      {state.message && <p className="text-sm text-primary">{state.message}</p>}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
