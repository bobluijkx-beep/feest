"use client";

import { useActionState, useState } from "react";
import { renderWithLayout, DEFAULT_LAYOUT_HTML } from "@lions/core/email/layout";
import { CAMPAIGN_PLACEHOLDERS } from "@lions/core/email/placeholders";
import { Button, Input, Label, Select, Card, CardContent } from "@lions/ui";
import { HtmlEditor } from "../../content/emails/html-editor";
import { saveTemplate, type TemplateActionState } from "./actions";

const SAMPLE_VARS = {
  voornaam: "Jan",
  event_naam: "Black and White Party Night",
  aantal_tickets: "2",
};

const PREVIEW_UNSUBSCRIBE_FOOTER =
  '<hr /><p style="font-size:12px;color:#888;">Wil je geen e-mails meer ontvangen? <a href="#">Afmelden</a>.</p>';

const initialState: TemplateActionState = {};

interface LayoutOption {
  id: string;
  name: string;
  bodyHtml: string;
  isDefault: boolean;
}

export function TemplateForm({
  template,
  layouts,
  customPlaceholderKeys = [],
}: {
  template?: { id: string; name: string; subject: string; bodyHtml: string; layoutId: string | null };
  layouts: LayoutOption[];
  customPlaceholderKeys?: string[];
}) {
  const [state, formAction, pending] = useActionState(saveTemplate, initialState);
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(template?.bodyHtml ?? "");
  const [layoutId, setLayoutId] = useState(template?.layoutId ?? "");
  const [showPreview, setShowPreview] = useState(false);

  const selectedLayout = layouts.find((l) => l.id === layoutId);
  const layoutHtml = selectedLayout?.bodyHtml ?? layouts.find((l) => l.isDefault)?.bodyHtml ?? DEFAULT_LAYOUT_HTML;
  const preview = renderWithLayout({
    layoutHtml,
    content: { subject, bodyHtml: bodyHtml + PREVIEW_UNSUBSCRIBE_FOOTER },
    vars: SAMPLE_VARS,
  });

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        {template && <input type="hidden" name="id" value={template.id} />}

        <div className="flex flex-col gap-1">
          <Label htmlFor="name">Naam (intern, voor in de lijst)</Label>
          <Input id="name" type="text" name="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
          <HtmlEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholders={[...CAMPAIGN_PLACEHOLDERS, ...customPlaceholderKeys]}
            rows={10}
          />
          <input type="hidden" name="bodyHtml" value={bodyHtml} />
        </div>
        <p className="text-xs text-muted-foreground">
          Onder elke mail wordt automatisch een afmeldlink toegevoegd, dus dat hoef je hier niet zelf te doen. Wil je
          de link liever ergens anders in de tekst, gebruik dan zelf de {"{{afmeldlink}}"}-placeholder.
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Bezig…" : "Opslaan"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "Voorbeeld verbergen" : "Voorbeeld tonen"}
          </Button>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        </div>
      </form>

      {showPreview && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-0">
            <p className="px-4 pt-4 text-sm">
              <strong>Onderwerp:</strong> {preview.subject}
            </p>
            <iframe title="E-mailvoorbeeld" srcDoc={preview.bodyHtml} className="h-[500px] w-full rounded-b-lg border-0" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
