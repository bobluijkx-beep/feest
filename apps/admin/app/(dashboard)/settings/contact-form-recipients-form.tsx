"use client";

import { useActionState } from "react";
import { Button, Card, CardHeader, CardTitle, CardContent, Label, Textarea } from "@lions/ui";
import { updateContactFormRecipients, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

export function ContactFormRecipientsForm({ recipients }: { recipients: string[] }) {
  const [state, formAction, pending] = useActionState(updateContactFormRecipients, initialState);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Contactformulier</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="recipients">Extra ontvangers</Label>
            <p className="text-xs text-muted-foreground">
              Een bericht via het contactformulier gaat altijd naar het clubadres, en daarnaast naar elk e-mailadres
              hieronder. Eén per regel.
            </p>
            <Textarea
              id="recipients"
              name="recipients"
              rows={4}
              defaultValue={recipients.join("\n")}
              placeholder="voorzitter@lionsvoorschoten.nl"
            />
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
