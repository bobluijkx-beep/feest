"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, Card, CardContent } from "@lions/ui";
import { HtmlEditor } from "../html-editor";
import { saveCustomPlaceholder, type SavePlaceholderState } from "./actions";

const initialState: SavePlaceholderState = {};

export function PlaceholderForm({
  id,
  keyValue: initialKey,
  valueHtml: initialValueHtml,
  description: initialDescription,
}: {
  id?: string;
  keyValue: string;
  valueHtml: string;
  description: string;
}) {
  const [state, formAction, pending] = useActionState(saveCustomPlaceholder, initialState);
  const [key, setKey] = useState(initialKey);
  const [valueHtml, setValueHtml] = useState(initialValueHtml);
  const [description, setDescription] = useState(initialDescription);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {id && <input type="hidden" name="id" value={id} />}
      <div className="flex flex-col gap-1">
        <Label htmlFor="key">Sleutel</Label>
        <Input
          id="key"
          type="text"
          name="key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="clubadres"
          className="max-w-sm font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Wordt in een template/lay-out gebruikt als {"{{"}
          {key || "sleutel"}
          {"}}"}. Alleen letters, cijfers en underscores.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="description">Omschrijving (optioneel)</Label>
        <Input
          id="description"
          type="text"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Bv. 'Postadres van de club, voor in e-mailvoetteksten'"
          className="max-w-md"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Waarde</Label>
        <HtmlEditor value={valueHtml} onChange={setValueHtml} rows={4} />
        <input type="hidden" name="valueHtml" value={valueHtml} />
      </div>

      <Card>
        <CardContent>
          <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Voorbeeld</h3>
          <div className="text-sm" dangerouslySetInnerHTML={{ __html: valueHtml }} />
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Bezig…" : "Opslaan"}
      </Button>
    </form>
  );
}
