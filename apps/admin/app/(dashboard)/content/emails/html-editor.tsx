"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Select } from "@lions/ui";
import { uploadEmailImage } from "./actions";

/** Lichtgewicht HTML-editor voor e-mailinhoud/-lay-outs: geen WYSIWYG (contentEditable +
 * execCommand is te fragiel/verouderd, en het resultaat moet toch geldige, verzendbare
 * HTML blijven) — in plaats daarvan een gewone brontekst-textarea met een werkbalk die
 * HTML op de cursorpositie invoegt (vet/cursief/link/kop/afbeelding/placeholder), plus de
 * al bestaande live iframe-voorbeeld ernaast om te zien wat je typt. */
export function HtmlEditor({
  value,
  onChange,
  placeholders = [],
  rows = 12,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholders?: string[];
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  function insertAtCursor(snippet: string, wrapSelection: boolean) {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + snippet);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const insertion = wrapSelection ? snippet.replace("%s", selected) : snippet;
    const next = value.slice(0, start) + insertion + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    startUpload(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadEmailImage(formData);
      if (result.error || !result.url) {
        setUploadError(result.error ?? "Uploaden mislukt.");
        return;
      }
      insertAtCursor(`<img src="${result.url}" alt="" style="max-width:100%;display:block;" />`, false);
    });
  }

  function handleLink() {
    const url = window.prompt("Naar welke URL moet de link verwijzen?", "https://");
    if (!url) return;
    insertAtCursor(`<a href="${url}">%s</a>`, true);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-input bg-muted/40 p-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-bold"
          onClick={() => insertAtCursor("<strong>%s</strong>", true)}
        >
          Vet
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="italic"
          onClick={() => insertAtCursor("<em>%s</em>", true)}
        >
          Cursief
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insertAtCursor("<h2>%s</h2>", true)}>
          Kop
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleLink}>
          Link
        </Button>
        <label>
          <span
            className={
              "inline-flex h-8 cursor-pointer items-center rounded-md border border-input bg-transparent px-3 text-sm shadow-xs hover:bg-accent/50" +
              (uploading ? " pointer-events-none opacity-60" : "")
            }
          >
            {uploading ? "Bezig met uploaden…" : "Afbeelding uploaden"}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploading} />
        </label>
        {placeholders.length > 0 && (
          <Select
            className="h-8 w-auto"
            defaultValue=""
            onChange={(e) => {
              const token = e.target.value;
              if (token) insertAtCursor(`{{${token}}}`, false);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Placeholder invoegen…
            </option>
            {placeholders.map((p) => (
              <option key={p} value={p}>
                {`{{${p}}}`}
              </option>
            ))}
          </Select>
        )}
      </div>
      {uploadError && <p className="border border-b-0 border-input px-2 py-1 text-xs text-destructive">{uploadError}</p>}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-b-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}
