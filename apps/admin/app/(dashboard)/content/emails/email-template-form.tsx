"use client";

import { useActionState, useState } from "react";
import { renderTemplate } from "@lions/core/email/template-engine";
import { renderWithLayout, DEFAULT_LAYOUT_HTML } from "@lions/core/email/layout";
import { ORDER_TEMPLATE_PLACEHOLDERS } from "@lions/core/email/placeholders";
import { Button, Input, Label, Select, Card, CardContent } from "@lions/ui";
import { HtmlEditor } from "./html-editor";
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

interface LayoutOption {
  id: string;
  name: string;
  bodyHtml: string;
  isDefault: boolean;
}

export function EmailTemplateForm({
  eventId,
  type,
  subject: initialSubject,
  bodyHtml: initialBodyHtml,
  layoutId: initialLayoutId,
  layouts,
}: {
  eventId: string;
  type: string;
  subject: string;
  bodyHtml: string;
  layoutId: string;
  layouts: LayoutOption[];
}) {
  const [state, formAction, pending] = useActionState(saveEmailTemplate, initialState);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [layoutId, setLayoutId] = useState(initialLayoutId);
  const [showPreview, setShowPreview] = useState(false);

  const preview = renderTemplate({ subject, bodyHtml }, SAMPLE_VARS);
  const selectedLayout = layouts.find((l) => l.id === layoutId);
  const layoutHtml = selectedLayout?.bodyHtml ?? layouts.find((l) => l.isDefault)?.bodyHtml ?? DEFAULT_LAYOUT_HTML;
  const wrapped = renderWithLayout({ layoutHtml, content: { subject, bodyHtml }, vars: SAMPLE_VARS });

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
          <Label htmlFor="layoutId">Lay-out</Label>
          <Select
            id="layoutId"
            name="layoutId"
            value={layoutId}
            onChange={(e) => setLayoutId(e.target.value)}
            className="max-w-xs"
          >
            <option value="">
              {layouts.find((l) => l.isDefault) ? `Standaard (${layouts.find((l) => l.isDefault)?.name})` : "Standaard"}
            </option>
            {layouts.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="bodyHtml">Inhoud (HTML)</Label>
          <HtmlEditor value={bodyHtml} onChange={setBodyHtml} placeholders={[...ORDER_TEMPLATE_PLACEHOLDERS]} rows={10} />
          <input type="hidden" name="bodyHtml" value={bodyHtml} />
        </div>
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
          <CardContent className="flex flex-col gap-2 p-0">
            <p className="px-4 pt-4 text-sm">
              <strong>Onderwerp:</strong> {preview.subject}
            </p>
            {/* iframe i.p.v. dangerouslySetInnerHTML: de e-mail-opmaak (renderWithLayout) is
                een volledig <html>/<body>-document met eigen achtergrondkleur — dat kun je
                niet zomaar in een gewone div injecteren zonder de rest van dit scherm te
                beïnvloeden. Zo ziet het bestuurslid precies wat er verstuurd wordt. */}
            <iframe title="E-mailvoorbeeld" srcDoc={wrapped.bodyHtml} className="h-[500px] w-full rounded-b-lg border-0" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
