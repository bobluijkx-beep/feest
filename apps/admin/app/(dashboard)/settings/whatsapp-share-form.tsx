"use client";

import { useActionState } from "react";
import { Button, Card, CardHeader, CardTitle, CardContent, Label, Textarea } from "@lions/ui";
import { updateWhatsappShareMessage, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

export function WhatsappShareForm({ text }: { text: string }) {
  const [state, formAction, pending] = useActionState(updateWhatsappShareMessage, initialState);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>WhatsApp-deelbericht</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="text">Bericht dat WhatsApp vooraf invult bij de &ldquo;WhatsApp-knop&rdquo; in een mailing</Label>
            <p className="text-xs text-muted-foreground">
              Gebruik <code>{"{{event_naam}}"}</code> en <code>{"{{ticketlink}}"}</code> om die op de gewenste plek in
              de tekst te zetten. Geldt voor alle toekomstige mailings. Facebook heeft geen vergelijkbare instelling
              — dat platform laat geen eigen tekst toe en pakt zijn voorbeeldkaart altijd van de naam/omschrijving
              van het evenement zelf.
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
