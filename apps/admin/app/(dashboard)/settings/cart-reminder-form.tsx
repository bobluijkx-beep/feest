"use client";

import { useActionState } from "react";
import { Button, Card, CardHeader, CardTitle, CardContent, Label, Textarea } from "@lions/ui";
import { updateCartReminderText, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

export function CartReminderForm({ text }: { text: string }) {
  const [state, formAction, pending] = useActionState(updateCartReminderText, initialState);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Winkelwagen-melding</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="text">Tekst bij &ldquo;alleen tickets in de winkelwagen&rdquo;</Label>
            <p className="text-xs text-muted-foreground">
              Verschijnt op de winkelwagenpagina zodra een koper alleen tickets heeft, naast een knop naar de
              feestartikelen.
            </p>
            <Textarea id="text" name="text" rows={3} defaultValue={text} />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Opslaan…" : "Opslaan"}
            </Button>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            {state.success && <p className="text-sm text-primary">Opgeslagen.</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
