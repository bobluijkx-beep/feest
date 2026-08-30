"use client";

import { useActionState, useState } from "react";
import { renderWithLayout } from "@lions/core/email/layout";
import { LAYOUT_PLACEHOLDERS } from "@lions/core/email/placeholders";
import { Button, Input, Label, Card, CardContent } from "@lions/ui";
import { HtmlEditor } from "../html-editor";
import { saveEmailLayout, type SaveLayoutState } from "./actions";

const SAMPLE_VARS = {
  voornaam: "Jan",
  event_naam: "Black and White Party Night",
  aantal_tickets: "2",
  ticketcode: "abc123, def456",
  datum: "17 oktober 2026",
  locatie: "Wapen van Voorschoten",
  tickets_sectie: "<p>Je tickets (met QR-code) vind je als bijlage bij deze e-mail.</p>",
  merchandise: "<p>Ook besteld: 1x Petje.</p>",
};

const SAMPLE_CONTENT = "<p>Beste Jan,</p><p>Dit is een voorbeeld van de inhoud van een e-mail — precies waar <code>{{content}}</code> in de lay-out staat.</p>";

const initialState: SaveLayoutState = {};

export function LayoutForm({
  id,
  name: initialName,
  bodyHtml: initialBodyHtml,
  isDefault: initialIsDefault,
}: {
  id?: string;
  name: string;
  bodyHtml: string;
  isDefault: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveEmailLayout, initialState);
  const [name, setName] = useState(initialName);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [isDefault, setIsDefault] = useState(initialIsDefault);
  const [showPreview, setShowPreview] = useState(true);

  const preview = renderWithLayout({
    layoutHtml: bodyHtml,
    content: { subject: "Voorbeeld", bodyHtml: SAMPLE_CONTENT },
    vars: SAMPLE_VARS,
  });

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <form action={formAction} className="flex flex-1 flex-col gap-4">
        {id && <input type="hidden" name="id" value={id} />}
        <div className="flex flex-col gap-1">
          <Label htmlFor="name">Naam</Label>
          <Input id="name" type="text" name="name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
        </div>
        <label htmlFor="isDefault" className="flex items-center gap-2 text-sm">
          <input
            id="isDefault"
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Standaard-lay-out (gebruikt als een e-mail geen eigen lay-out heeft gekozen)
        </label>
        <input type="hidden" name="isDefault" value={isDefault ? "true" : "false"} />
        <div className="flex flex-col gap-1">
          <Label htmlFor="bodyHtml">HTML</Label>
          <HtmlEditor value={bodyHtml} onChange={setBodyHtml} placeholders={LAYOUT_PLACEHOLDERS} rows={18} />
          <input type="hidden" name="bodyHtml" value={bodyHtml} />
        </div>
        <p className="text-xs text-muted-foreground">
          Moet precies één keer <code>{"{{content}}"}</code> bevatten — daar komt de eigenlijke inhoud van de e-mail
          (bv. de orderbevestiging of mailingtekst). Overige placeholders zijn optioneel en lossen alleen op als de
          e-mail die daadwerkelijk meegeeft.
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Opslaan…" : "Opslaan"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)} className="lg:hidden">
            {showPreview ? "Voorbeeld verbergen" : "Voorbeeld tonen"}
          </Button>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        </div>
      </form>

      {showPreview && (
        <Card className="flex-1">
          <CardContent className="flex h-full flex-col gap-2 p-0">
            <p className="px-4 pt-4 text-sm text-muted-foreground">Voorbeeld met voorbeeldgegevens</p>
            <iframe title="Lay-outvoorbeeld" srcDoc={preview.bodyHtml} className="h-[600px] w-full rounded-b-lg border-0" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
