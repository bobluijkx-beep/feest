"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@lions/ui";
import { addTestBuyerAction, type TestBuyerState } from "./actions";

const initialState: TestBuyerState = {};

export function TestBuyerForm({
  eventId,
  products,
}: {
  eventId: string;
  products: { id: string; name: string; priceCents: number }[];
}) {
  const [state, formAction, pending] = useActionState(addTestBuyerAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="buyerName">Naam</Label>
        <Input id="buyerName" name="buyerName" required className="w-40" placeholder="Test Koper" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="buyerEmail">E-mailadres (komt echt aan)</Label>
        <Input id="buyerEmail" name="buyerEmail" type="email" required className="w-56" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="productId">Ticket/product</Label>
        <Select id="productId" name="productId" required className="w-56">
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (€{(p.priceCents / 100).toFixed(2).replace(".", ",")})
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="quantity">Aantal</Label>
        <Input id="quantity" name="quantity" type="number" min="1" max="20" defaultValue="1" className="w-20" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="donationEuros">Eerdere donatie (€, optioneel)</Label>
        <Input id="donationEuros" name="donationEuros" inputMode="decimal" placeholder="0,00" className="w-32" />
      </div>
      <Button type="submit" disabled={pending || products.length === 0}>
        {pending ? "Toevoegen…" : "Testkoper toevoegen"}
      </Button>
      {state.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-primary">Testkoper toegevoegd.</p>}
    </form>
  );
}
