"use client";

import { useActionState } from "react";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label } from "@lions/ui";
import { updateMollieSettings, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

export function MollieSettingsForm({
  mode,
  hasTestKey,
  hasLiveKey,
}: {
  mode: "test" | "live";
  hasTestKey: boolean;
  hasLiveKey: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateMollieSettings, initialState);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Mollie</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Modus</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" value="test" defaultChecked={mode === "test"} className="size-4" />
              Test
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" value="live" defaultChecked={mode === "live"} className="size-4" />
              <span>
                Live <span className="text-destructive">(echte betalingen!)</span>
              </span>
            </label>
          </fieldset>

          <div className="flex flex-col gap-1">
            <Label htmlFor="testKey">
              Test-API-key
              {hasTestKey && (
                <span className="text-xs font-normal text-muted-foreground">(ingesteld — laat leeg om te behouden)</span>
              )}
            </Label>
            <Input id="testKey" type="password" name="testKey" placeholder={hasTestKey ? "•••• (ingesteld)" : "test_..."} />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="liveKey">
              Live-API-key
              {hasLiveKey && (
                <span className="text-xs font-normal text-muted-foreground">(ingesteld — laat leeg om te behouden)</span>
              )}
            </Label>
            <Input id="liveKey" type="password" name="liveKey" placeholder={hasLiveKey ? "•••• (ingesteld)" : "live_..."} />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Opslaan…" : "Opslaan"}
            </Button>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            {state.success && <p className="text-sm text-primary">Opgeslagen.</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
