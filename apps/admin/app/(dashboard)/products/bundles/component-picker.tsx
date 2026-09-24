"use client";

import { useState } from "react";
import { Button, Input, Label, Select } from "@lions/ui";

interface PickerProduct {
  id: string;
  name: string;
  kind: string;
}

const KIND_LABEL: Record<string, string> = { TICKET: "Ticket", MERCHANDISE: "Product" };

/** Dynamische lijst van (product, aantal)-rijen voor een combi — gedeeld door de nieuw- en
 * bewerkformulieren (create-bundle-form.tsx, bundle-row-form.tsx). Rendert per rij twee
 * hidden inputs (`componentProductId`/`componentQuantity`, gelijknamig over alle rijen)
 * i.p.v. losse geïndexeerde veldnamen — actions.ts's parseComponents leest ze als
 * parallelle arrays terug via `formData.getAll`. Alleen TICKET/MERCHANDISE-producten zijn
 * kiesbaar: een DONATION-product heeft geen vaste prijs/voorraad en past niet in een combi
 * met een vaste prijsverdeling (create-order.ts's splitBundlePriceCents). */
export function ComponentPicker({
  availableProducts,
  defaultComponents,
}: {
  availableProducts: PickerProduct[];
  defaultComponents?: { productId: string; quantity: number }[];
}) {
  const [rows, setRows] = useState<{ productId: string; quantity: number }[]>(
    defaultComponents && defaultComponents.length > 0
      ? defaultComponents
      : [{ productId: availableProducts[0]?.id ?? "", quantity: 1 }],
  );

  function updateRow(index: number, patch: Partial<{ productId: string; quantity: number }>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const unused = availableProducts.find((p) => !rows.some((r) => r.productId === p.id));
    setRows((prev) => [...prev, { productId: unused?.id ?? availableProducts[0]?.id ?? "", quantity: 1 }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Label>Bevat</Label>
      {availableProducts.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Dit evenement heeft nog geen actieve tickets/producten om te combineren.
        </p>
      )}
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            value={row.productId}
            onChange={(e) => updateRow(index, { productId: e.target.value })}
            className="w-56"
          >
            {availableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({KIND_LABEL[p.kind] ?? p.kind})
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min="1"
            value={row.quantity}
            onChange={(e) => updateRow(index, { quantity: Number(e.target.value) })}
            className="w-20"
          />
          <input type="hidden" name="componentProductId" value={row.productId} />
          <input type="hidden" name="componentQuantity" value={row.quantity} />
          {rows.length > 1 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(index)}>
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
        disabled={availableProducts.length === 0 || rows.length >= availableProducts.length}
        onClick={addRow}
      >
        + Product toevoegen
      </Button>
    </div>
  );
}
