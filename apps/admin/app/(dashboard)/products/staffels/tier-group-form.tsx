"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, Select } from "@lions/ui";
import {
  createTierGroup,
  updateTierGroup,
  deleteTierGroup,
  type TierGroupActionState,
} from "./actions";

const initialState: TierGroupActionState = {};

export interface ProductOption {
  id: string;
  name: string;
  priceCents: number;
  /** Naam van een andere staffelgroep waar dit product al in zit (dan niet te kiezen). */
  takenBy: string | null;
}

export interface EventOption {
  id: string;
  name: string;
  products: ProductOption[];
}

export interface GroupDefaults {
  id: string;
  name: string;
  mode: "EVERY_NTH_FREE" | "TIER_TABLE";
  freeEvery: number | null;
  tiers: { quantity: number; totalCents: number }[];
  productIds: string[];
}

function euros(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Eén formulier voor nieuw én bewerken (group gezet = bewerken, het event staat dan vast). Een
 * staffelgroep legt vast hoe de stuks van de gekozen producten samen worden geprijsd; zie
 * packages/core/src/pricing/tiers.ts voor de berekening. */
export function TierGroupForm({ events, group }: { events: EventOption[]; group?: GroupDefaults }) {
  const [state, formAction, pending] = useActionState(group ? updateTierGroup : createTierGroup, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTierGroup, initialState);

  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [mode, setMode] = useState<GroupDefaults["mode"]>(group?.mode ?? "TIER_TABLE");
  const [rows, setRows] = useState<{ quantity: string; euros: string }[]>(
    group && group.tiers.length > 0
      ? group.tiers.map((t) => ({ quantity: String(t.quantity), euros: euros(t.totalCents) }))
      : [{ quantity: "", euros: "" }],
  );

  const products = events.find((e) => e.id === eventId)?.products ?? [];

  function updateRow(index: number, patch: Partial<{ quantity: string; euros: string }>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-4">
        {group ? <input type="hidden" name="id" value={group.id} /> : null}
        {group ? <input type="hidden" name="eventId" value={eventId} /> : null}

        <div className="flex flex-wrap items-end gap-3">
          {!group && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="eventId">Evenement</Label>
              <Select id="eventId" name="eventId" value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-56">
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor={`name-${group?.id ?? "new"}`}>Naam</Label>
            <Input
              id={`name-${group?.id ?? "new"}`}
              name="name"
              required
              defaultValue={group?.name ?? ""}
              placeholder="bv. Oliebollen"
              className="w-56"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`mode-${group?.id ?? "new"}`}>Soort staffel</Label>
            <Select
              id={`mode-${group?.id ?? "new"}`}
              name="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as GroupDefaults["mode"])}
              className="w-72"
            >
              <option value="TIER_TABLE">Staffellijst (aantal → totaalprijs)</option>
              <option value="EVERY_NTH_FREE">Elke N-de stuk gratis</option>
            </Select>
          </div>
          {mode === "EVERY_NTH_FREE" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`freeEvery-${group?.id ?? "new"}`}>Elke … e gratis</Label>
              <Input
                id={`freeEvery-${group?.id ?? "new"}`}
                name="freeEvery"
                type="number"
                min="2"
                max="100"
                defaultValue={group?.freeEvery ?? 5}
                className="w-24"
              />
            </div>
          )}
        </div>

        {mode === "TIER_TABLE" && (
          <div className="flex flex-col gap-2">
            <Label>Staffellijst</Label>
            <p className="text-xs text-muted-foreground">
              Per regel: bij dit aantal betaal je dit totaalbedrag. Een aantal tussen twee regels wordt de
              goedkoopste combinatie van de genoemde aantallen plus losse stuks (bv. met 5 → €4,00 en 10 → €7,50
              kosten 12 stuks 10 + 2 los). Stuks van alle producten in de groep tellen samen.
            </p>
            {rows.map((row, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Input
                  name="tierQuantity"
                  type="number"
                  min="2"
                  value={row.quantity}
                  onChange={(e) => updateRow(index, { quantity: e.target.value })}
                  placeholder="Aantal"
                  className="w-24"
                />
                <span className="text-sm">stuks voor €</span>
                <Input
                  name="tierEuros"
                  inputMode="decimal"
                  value={row.euros}
                  onChange={(e) => updateRow(index, { euros: e.target.value })}
                  placeholder="Totaalprijs, bv. 7,50"
                  className="w-40"
                />
                {rows.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>
                    Verwijderen
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setRows((prev) => [...prev, { quantity: "", euros: "" }])}
            >
              + Regel toevoegen
            </Button>
          </div>
        )}

        <fieldset className="flex flex-col gap-1" key={eventId}>
          <legend className="text-sm font-medium">Producten in deze staffel</legend>
          <p className="text-xs text-muted-foreground">
            Alle gekozen producten moeten dezelfde prijs per stuk hebben (bv. oliebollen met en zonder krenten).
          </p>
          {products.length === 0 && <p className="text-sm text-muted-foreground">Geen producten gevonden.</p>}
          {products.map((product) => {
            const taken = product.takenBy !== null && !group?.productIds.includes(product.id);
            return (
              <label key={product.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="productId"
                  value={product.id}
                  defaultChecked={group?.productIds.includes(product.id) ?? false}
                  disabled={taken}
                  className="size-4 rounded border-input"
                />
                {product.name} (€{euros(product.priceCents)})
                {taken && <span className="text-xs text-muted-foreground">— zit al in &quot;{product.takenBy}&quot;</span>}
              </label>
            );
          })}
        </fieldset>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Opslaan…" : group ? "Opslaan" : "+ Staffel aanmaken"}
          </Button>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && <p className="text-sm text-primary">Opgeslagen.</p>}
        </div>
      </form>

      {group && (
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!window.confirm(`Staffel "${group.name}" verwijderen? De producten gaan weer tegen de normale prijs.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={group.id} />
          <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
            {deletePending ? "Bezig…" : "Staffel verwijderen"}
          </Button>
          {deleteState.error && <p className="mt-1 text-sm text-destructive">{deleteState.error}</p>}
        </form>
      )}
    </div>
  );
}
