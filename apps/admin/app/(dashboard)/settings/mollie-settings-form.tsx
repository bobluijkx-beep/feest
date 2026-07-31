"use client";

import { useActionState } from "react";
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
    <form action={formAction} style={{ maxWidth: 480 }}>
      <fieldset style={{ marginBottom: "1rem" }}>
        <legend>Modus</legend>
        <label style={{ display: "block" }}>
          <input type="radio" name="mode" value="test" defaultChecked={mode === "test"} /> Test
        </label>
        <label style={{ display: "block" }}>
          <input type="radio" name="mode" value="live" defaultChecked={mode === "live"} /> Live (echte betalingen!)
        </label>
      </fieldset>

      <div style={{ marginBottom: "0.75rem" }}>
        <label>
          Test-API-key {hasTestKey && <em>(ingesteld — laat leeg om te behouden)</em>}
          <br />
          <input type="password" name="testKey" placeholder={hasTestKey ? "•••• (ingesteld)" : "test_..."} style={{ width: "100%" }} />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Live-API-key {hasLiveKey && <em>(ingesteld — laat leeg om te behouden)</em>}
          <br />
          <input type="password" name="liveKey" placeholder={hasLiveKey ? "•••• (ingesteld)" : "live_..."} style={{ width: "100%" }} />
        </label>
      </div>

      <button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Opslaan"}
      </button>

      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
      {state.success && <p style={{ color: "green" }}>Opgeslagen.</p>}
    </form>
  );
}
