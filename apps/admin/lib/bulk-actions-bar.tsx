"use client";

import { useState, useTransition } from "react";
import { Button } from "@lions/ui";

export interface BulkAction {
  label: string;
  pendingLabel?: string;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  /** Bevestigingstekst voor window.confirm — overgeslagen als niet meegegeven. */
  confirm?: string;
  onRun: () => Promise<{ error?: string } | void>;
}

/** Gedeelde werkbalk boven een tabel met selectievakjes: "Alles selecteren/deselecteren"
 * plus, zodra er iets geselecteerd is, de bulkacties voor die lijst (bv. "Op inactief
 * zetten", "Verwijderen"). Gebruikt door orders/producten/gebruikers — elke lijst geeft
 * zijn eigen `actions` mee, de werkbalk zelf weet niets van wat er precies gebeurt. */
export function BulkActionsBar({
  count,
  allSelected,
  onToggleAll,
  actions,
}: {
  count: number;
  allSelected: boolean;
  onToggleAll: () => void;
  actions: BulkAction[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [runningIndex, setRunningIndex] = useState<number | null>(null);

  function run(action: BulkAction, index: number) {
    if (action.confirm && !window.confirm(action.confirm)) return;
    setError(null);
    setRunningIndex(index);
    startTransition(async () => {
      const result = await action.onRun();
      setError(result && "error" in result ? (result.error ?? null) : null);
      setRunningIndex(null);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" size="sm" onClick={onToggleAll}>
        {allSelected ? "Alles deselecteren" : "Alles selecteren"}
      </Button>
      {count > 0 && (
        <>
          <span className="text-sm text-muted-foreground">{count} geselecteerd</span>
          {actions.map((action, i) => (
            <Button
              key={action.label}
              type="button"
              variant={action.variant ?? "outline"}
              size="sm"
              disabled={pending}
              onClick={() => run(action, i)}
            >
              {pending && runningIndex === i ? (action.pendingLabel ?? "Bezig…") : action.label}
            </Button>
          ))}
        </>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
