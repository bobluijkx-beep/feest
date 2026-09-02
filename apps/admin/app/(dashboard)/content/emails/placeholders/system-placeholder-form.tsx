"use client";

import { useActionState, useState } from "react";
import { Button } from "@lions/ui";
import { HtmlEditor } from "../html-editor";
import { saveSystemPlaceholderTemplate, resetSystemPlaceholderTemplate } from "./system-placeholder-actions";
import type { SavePlaceholderState } from "./actions";

const initialState: SavePlaceholderState = {};

export function SystemPlaceholderForm({
  placeholderKey,
  label,
  helpText,
  hasValue,
  template: initialTemplate,
  isOverridden,
}: {
  placeholderKey: string;
  label: string;
  helpText: string;
  hasValue: boolean;
  template: string;
  isOverridden: boolean;
}) {
  const [saveState, saveAction, savePending] = useActionState(saveSystemPlaceholderTemplate, initialState);
  const [resetState, resetAction, resetPending] = useActionState(resetSystemPlaceholderTemplate, initialState);
  const [template, setTemplate] = useState(initialTemplate);

  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        {isOverridden && (
          <form action={resetAction}>
            <input type="hidden" name="key" value={placeholderKey} />
            <Button type="submit" variant="ghost" size="sm" disabled={resetPending}>
              {resetPending ? "Bezig…" : "Terugzetten naar standaard"}
            </Button>
          </form>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{helpText}</p>
      <form action={saveAction} className="flex flex-col gap-2">
        <input type="hidden" name="key" value={placeholderKey} />
        <HtmlEditor value={template} onChange={setTemplate} placeholders={hasValue ? ["waarde"] : []} rows={3} />
        <input type="hidden" name="template" value={template} />
        <Button type="submit" variant="outline" size="sm" disabled={savePending} className="self-start">
          {savePending ? "Bezig…" : "Opslaan"}
        </Button>
        {saveState.error && <p className="text-xs text-destructive">{saveState.error}</p>}
        {resetState.error && <p className="text-xs text-destructive">{resetState.error}</p>}
      </form>
    </div>
  );
}
