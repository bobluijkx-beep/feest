"use client";

import { useActionState, useState } from "react";
import { renderTemplate } from "@lions/core/email/template-engine";
import { Button, Input, Label, Card, CardContent } from "@lions/ui";
import { createCampaign, type CreateCampaignState } from "./actions";
import type { CampaignSegment } from "@lions/core";

const SAMPLE_VARS = {
  voornaam: "Jan",
  event_naam: "Black and White Party Night",
  aantal_tickets: "2",
};

const initialState: CreateCampaignState = {};

export function CampaignComposeForm({
  segment,
  recipientCount,
}: {
  segment: CampaignSegment;
  recipientCount: number;
}) {
  const [state, formAction, pending] = useActionState(createCampaign, initialState);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const preview = renderTemplate({ subject, bodyHtml }, SAMPLE_VARS);

  return (
    <div className="flex flex-col gap-4">
      <form
        action={formAction}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          if (
            !window.confirm(
              `Deze mailing versturen naar ${recipientCount} deelnemer${recipientCount === 1 ? "" : "s"}? Dit kan niet ongedaan worden gemaakt.`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="eventId" value={segment.eventId} />
        {(segment.productKinds ?? []).map((kind) => (
          <input key={kind} type="hidden" name="productKinds" value={kind} />
        ))}
        <input type="hidden" name="checkedInFilter" value={segment.checkedInFilter ?? "ANY"} />

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
          <code>{"{{aantal_tickets}}"}</code>
        </p>
        <p className="text-xs text-muted-foreground">
          Onder elke mail wordt automatisch een afmeldlink toegevoegd — die hoef je niet zelf op te nemen.
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending || recipientCount === 0}>
            {pending ? "Bezig…" : `Versturen naar ${recipientCount} deelnemer${recipientCount === 1 ? "" : "s"}`}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "Voorbeeld verbergen" : "Voorbeeld tonen"}
          </Button>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
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
