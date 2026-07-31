"use client";

import { useState } from "react";
import { PageBlockView } from "@lions/ui";

type Fields = Record<string, string>;

interface FieldDef {
  name: string;
  label: string;
  kind?: "text" | "textarea";
}

const FIELD_DEFS: Record<string, FieldDef[]> = {
  hero: [
    { name: "title", label: "Titel" },
    { name: "subtitle", label: "Subtitel", kind: "textarea" },
    { name: "imageUrl", label: "Afbeelding-URL (optioneel)" },
  ],
  programme: [
    { name: "title", label: "Titel" },
    { name: "body", label: "Tekst", kind: "textarea" },
  ],
  sponsor: [
    { name: "name", label: "Naam" },
    { name: "logoUrl", label: "Logo-URL (optioneel)" },
    { name: "link", label: "Link (optioneel)" },
  ],
  faq_item: [
    { name: "question", label: "Vraag" },
    { name: "answer", label: "Antwoord", kind: "textarea" },
  ],
  cta: [
    { name: "label", label: "Knoptekst" },
    { name: "href", label: "Link" },
  ],
};

export function BlockForm({
  type,
  action,
  initial,
  submitLabel,
  hiddenFields,
}: {
  type: string;
  action: (formData: FormData) => void | Promise<void>;
  initial: { order: number; isPublished: boolean; content: Record<string, string> };
  submitLabel: string;
  hiddenFields?: Record<string, string>;
}) {
  const fields = FIELD_DEFS[type] ?? [];
  const [values, setValues] = useState<Fields>(() => {
    const base: Fields = {};
    for (const f of fields) base[f.name] = initial.content[f.name] ?? "";
    return base;
  });
  const [showPreview, setShowPreview] = useState(false);

  return (
    <form action={action}>
      {hiddenFields &&
        Object.entries(hiddenFields).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <input type="hidden" name="type" value={type} />

      {fields.map((f) => (
        <div key={f.name} style={{ marginBottom: "0.75rem" }}>
          <label>
            {f.label}
            <br />
            {f.kind === "textarea" ? (
              <textarea
                name={f.name}
                value={values[f.name]}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                rows={4}
                style={{ width: "100%" }}
              />
            ) : (
              <input
                type="text"
                name={f.name}
                value={values[f.name]}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                style={{ width: "100%" }}
              />
            )}
          </label>
        </div>
      ))}

      <div style={{ marginBottom: "0.75rem" }}>
        <label>
          Volgorde <input type="number" name="order" defaultValue={initial.order} style={{ width: 80 }} />
        </label>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label>
          <input type="checkbox" name="isPublished" defaultChecked={initial.isPublished} /> Gepubliceerd
        </label>
      </div>

      <button type="submit">{submitLabel}</button>{" "}
      <button type="button" onClick={() => setShowPreview((v) => !v)}>
        {showPreview ? "Voorbeeld verbergen" : "Voorbeeld tonen"}
      </button>

      {showPreview && (
        <div style={{ border: "1px solid #ddd", padding: "1rem", marginTop: "1rem" }}>
          <PageBlockView type={type} content={values} />
        </div>
      )}
    </form>
  );
}
