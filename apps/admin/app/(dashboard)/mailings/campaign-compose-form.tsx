"use client";

import { useActionState, useMemo, useState } from "react";
import { renderWithLayout, DEFAULT_LAYOUT_HTML } from "@lions/core/email/layout";
import { CAMPAIGN_PLACEHOLDERS } from "@lions/core/email/placeholders";
import { Button, Input, Label, Select, Textarea, Card, CardContent } from "@lions/ui";
import { HtmlEditor } from "../content/emails/html-editor";
import { createCampaign, type CreateCampaignState } from "./actions";
import type { CampaignSegment, SegmentRecipient } from "@lions/core";

const SAMPLE_VARS = {
  voornaam: "Jan",
  event_naam: "Black and White Party Night",
  aantal_tickets: "2",
};

const PREVIEW_UNSUBSCRIBE_FOOTER =
  '<hr /><p style="font-size:12px;color:#888;">Wil je geen e-mails meer ontvangen? <a href="#">Afmelden</a>.</p>';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialState: CreateCampaignState = {};

interface LayoutOption {
  id: string;
  name: string;
  bodyHtml: string;
  isDefault: boolean;
}

/** Ruwe client-side schatting van het aantal geldige, nog niet al geselecteerde adressen in
 * het vrije testadres-veld — alleen voor de teller/knoptekst. De server (buildAdHocRecipients)
 * is de echte bron van waarheid en filtert ook nog op EmailOptOut. */
function countExtraEmails(raw: string, exclude: Set<string>): number {
  const emails = new Set<string>();
  for (const part of raw.split(/[\n,]/)) {
    const email = part.trim().toLowerCase();
    if (email && EMAIL_RE.test(email) && !exclude.has(email)) emails.add(email);
  }
  return emails.size;
}

export function CampaignComposeForm({
  segment,
  candidates,
  layouts,
  customPlaceholderKeys = [],
}: {
  segment: CampaignSegment;
  candidates: SegmentRecipient[];
  layouts: LayoutOption[];
  customPlaceholderKeys?: string[];
}) {
  const [state, formAction, pending] = useActionState(createCampaign, initialState);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [layoutId, setLayoutId] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  // Standaard iedereen aangevinkt (normale verzending); handmatig uitzetten voor een
  // kleinere/test-doelgroep. Dit component wordt door de pagina ge-remount (key={...}) zodra
  // de doelgroep-filters wijzigen, dus deze state hoeft zichzelf niet te synchroniseren met
  // een wijzigende `candidates`-prop.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(candidates.map((c) => c.email.toLowerCase())));
  const [extraEmails, setExtraEmails] = useState("");

  function toggle(email: string) {
    const key = email.toLowerCase();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const extraCount = useMemo(() => countExtraEmails(extraEmails, selected), [extraEmails, selected]);
  const totalCount = selected.size + extraCount;

  const selectedLayout = layouts.find((l) => l.id === layoutId);
  const layoutHtml = selectedLayout?.bodyHtml ?? layouts.find((l) => l.isDefault)?.bodyHtml ?? DEFAULT_LAYOUT_HTML;
  const preview = renderWithLayout({
    layoutHtml,
    content: { subject, bodyHtml: bodyHtml + PREVIEW_UNSUBSCRIBE_FOOTER },
    vars: SAMPLE_VARS,
  });

  return (
    <div className="flex flex-col gap-4">
      <form
        action={formAction}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          if (
            !window.confirm(
              `Deze mailing versturen naar ${totalCount} ontvanger${totalCount === 1 ? "" : "s"}? Dit kan niet ongedaan worden gemaakt.`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="eventId" value={segment.eventId} />
        <input type="hidden" name="segmentType" value={segment.type} />
        {segment.type === "EVENT" && (
          <>
            {(segment.productKinds ?? []).map((kind) => (
              <input key={kind} type="hidden" name="productKinds" value={kind} />
            ))}
            <input type="hidden" name="checkedInFilter" value={segment.checkedInFilter ?? "ANY"} />
          </>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>
              Ontvangers ({selected.size} van {candidates.length} geselecteerd)
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set(candidates.map((c) => c.email.toLowerCase())))}
              >
                Alles selecteren
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Alles deselecteren
              </Button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border border-input p-2">
            {candidates.map((c) => (
              <label key={c.email} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(c.email.toLowerCase())}
                  onChange={() => toggle(c.email)}
                  className="h-4 w-4 shrink-0 rounded border-input"
                />
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground">{c.email}</span>
              </label>
            ))}
            {candidates.length === 0 && (
              <p className="text-sm text-muted-foreground">Geen kandidaten voor deze doelgroep.</p>
            )}
          </div>
          {candidates
            .filter((c) => selected.has(c.email.toLowerCase()))
            .map((c) => (
              <input key={c.email} type="hidden" name="selectedEmails" value={c.email} />
            ))}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="extraEmails">Extra testadressen (los van de doelgroep hierboven)</Label>
          <Textarea
            id="extraEmails"
            name="extraEmails"
            rows={2}
            placeholder={"jouw-adres@voorbeeld.nl\npartner@voorbeeld.nl"}
            value={extraEmails}
            onChange={(e) => setExtraEmails(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Eén e-mailadres per regel of met komma&apos;s gescheiden. Handig om bv. alleen naar jezelf te testen —
            zet dan hierboven &quot;Alles deselecteren&quot; en vul hier je eigen adres in.
          </p>
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
          <Button type="submit" disabled={pending || totalCount === 0}>
            {pending ? "Bezig…" : `Versturen naar ${totalCount} ontvanger${totalCount === 1 ? "" : "s"}`}
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
