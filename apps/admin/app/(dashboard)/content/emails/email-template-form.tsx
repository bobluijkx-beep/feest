"use client";

import { useActionState, useState } from "react";
import { renderTemplate } from "@lions/core/email/template-engine";
import { saveEmailTemplate, type SaveTemplateState } from "./actions";

const SAMPLE_VARS = {
  voornaam: "Jan",
  event_naam: "Goededoelenfeest Lionsclub Voorschoten",
  aantal_tickets: "2",
  ticketcode: "abc123, def456",
  datum: "14 november 2026",
  locatie: "Café De Voorbeeld",
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
    <div>
      <form action={formAction}>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="type" value={type} />
        <div style={{ marginBottom: "0.75rem" }}>
          <label>
            Onderwerp
            <br />
            <input
              type="text"
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>
            Inhoud (HTML)
            <br />
            <textarea
              name="bodyHtml"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={10}
              style={{ width: "100%", fontFamily: "monospace" }}
            />
          </label>
        </div>
        <p>
          Beschikbare placeholders: <code>{"{{voornaam}}"}</code> <code>{"{{event_naam}}"}</code>{" "}
          <code>{"{{aantal_tickets}}"}</code> <code>{"{{ticketcode}}"}</code> <code>{"{{datum}}"}</code>{" "}
          <code>{"{{locatie}}"}</code>
        </p>
        <button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </button>{" "}
        <button type="button" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Voorbeeld verbergen" : "Voorbeeld tonen"}
        </button>
        {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
        {state.success && <p style={{ color: "green" }}>Opgeslagen.</p>}
      </form>

      {showPreview && (
        <div style={{ border: "1px solid #ddd", padding: "1rem", marginTop: "1rem" }}>
          <p>
            <strong>Onderwerp:</strong> {preview.subject}
          </p>
          <div dangerouslySetInnerHTML={{ __html: preview.bodyHtml }} />
        </div>
      )}
    </div>
  );
}
