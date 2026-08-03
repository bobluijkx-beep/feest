"use client";

import { useActionState, useState } from "react";
import { renderTemplate } from "@lions/core/email/template-engine";
import { Button, Input, Label, Card, CardContent } from "@lions/ui";
import { saveEmailTemplate, type SaveTemplateState } from "./actions";

const SAMPLE_VARS = {
  voornaam: "Jan",
  event_naam: "Goededoelenfeest Lionsclub Voorschoten",
  aantal_tickets: "2",
  ticketcode: "abc123, def456",
  datum: "14 november 2026",
  locatie: "Café De Voorbeeld",
  tickets_sectie: "<p>Je tickets (met QR-code) vind je als bijlage bij deze e-mail.</p>",
  merchandise: "<p>Ook besteld: 1x T-shirt (maat L).</p>",
};

const initialState: SaveTemplateState = {};

export function EmailTemplateForm({
  eventId,
  type,
  subject: initialSubject,
  bodyHtml: initialBodyHtml,
}: {
  eventId: string;
  type: string;
  subject: string;
  bodyHtml: string;
}) {
  const [state, formAction, pending] = useActionState(saveEmailTemplate, initialState);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [showPreview, setShowPreview] = useState(false);

  const preview = renderTemplate({ subject, bodyHtml }, SAMPLE_VARS);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="type" value={type} />
        <div className="flex flex-col gap-1">
          <Label htmlFor="subject">Onderwerp</Label>
          <Input id="subject" type="text" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="bodyHtml">Inhoud (HTML)</Label>
          <textarea
            id="bodyHtml"
            name="bodyHtml"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Beschikbare placeholders: <code>{"{{voornaam}}"}</code> <code>{"{{event_naam}}"}</code>{" "}
          <code>{"{{aantal_tickets}}"}</code> <code>{"{{ticketcode}}"}</code> <code>{"{{datum}}"}</code>{" "}
          <code>{"{{locatie}}"}</code> <code>{"{{tickets_sectie}}"}</code> <code>{"{{merchandise}}"}</code>
        </p>
        <p className="text-xs text-muted-foreground">
          <code>{"{{tickets_sectie}}"}</code> en <code>{"{{merchandise}}"}</code> zijn kant-en-klare HTML-blokken die
          vanzelf leeg zijn als een bestelling geen tickets, resp. geen merchandise bevat (bv. een pure
          oliebollenverkoop).
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Opslaan…" : "Opslaan"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "Voorbeeld verbergen" : "Voorbeeld tonen"}
          </Button>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && <p className="text-sm text-primary">Opgeslagen.</p>}
        </div>
      </form>

      {showPreview && (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm">
              <strong>Onderwerp:</strong> {preview.subject}
            </p>
            <div className="text-sm" dangerouslySetInnerHTML={{ __html: preview.bodyHtml }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
