"use client";

import { useState } from "react";
import { PageBlockView, Button, Input, Label, Select } from "@lions/ui";

type Fields = Record<string, string>;

interface FieldDef {
  name: string;
  label: string;
  kind?: "text" | "textarea" | "select";
  options?: { value: string; label: string }[];
}

const FIELD_DEFS: Record<string, FieldDef[]> = {
  hero: [
    { name: "eyebrow", label: "Aankondiging boven de titel (optioneel)" },
    { name: "title", label: "Titel" },
    { name: "subtitle", label: "Subtitel", kind: "textarea" },
    { name: "imageUrl", label: "Afbeelding-URL (optioneel)" },
    { name: "ctaLabel", label: "Knoptekst (optioneel)" },
    { name: "ctaHref", label: "Link voor de knop (optioneel)" },
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
    <form action={action} className="flex flex-col gap-4">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <input type="hidden" name="type" value={type} />

      {fields.map((f) => (
        <div key={f.name} className="flex flex-col gap-1">
          <Label htmlFor={f.name}>{f.label}</Label>
          {f.kind === "textarea" ? (
            <textarea
              id={f.name}
              name={f.name}
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          ) : f.kind === "select" ? (
            <Select
              id={f.name}
              name={f.name}
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className="w-48"
            >
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id={f.name}
              type="text"
              name={f.name}
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="order">Volgorde</Label>
          <Input id="order" type="number" name="order" defaultValue={initial.order} className="w-20" />
        </div>
        <label className="flex items-center gap-2 pb-1.5 text-sm">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={initial.isPublished}
            className="size-4 rounded border-input"
          />
          Gepubliceerd
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit">{submitLabel}</Button>
        <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Voorbeeld verbergen" : "Voorbeeld tonen"}
        </Button>
      </div>

      {showPreview && (
        <div className="rounded-lg border border-border p-4">
          <PageBlockView type={type} content={values} />
        </div>
      )}
    </form>
  );
}
