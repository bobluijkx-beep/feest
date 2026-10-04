"use client";

import { useState } from "react";
import { Button, Input, Label } from "@lions/ui";
import { chooseCancellationOption } from "../actions";

function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/** Eén formulier per keuze, elk met een bevestigingsvraag — de keuze staat na het versturen
 * onherroepelijk vast (zie submitCancellationChoice), dus voorkomen we een misklik met een
 * expliciete window.confirm. De derde keuze ("deels doneren") toont live wat er terugkomt. */
export function ChoiceForm({ token, amountCents }: { token: string; amountCents: number }) {
  const amountLabel = formatEuro(amountCents);
  const [donateInput, setDonateInput] = useState("");

  const donateEuros = Number(donateInput.replace(",", "."));
  const donateCents = Number.isFinite(donateEuros) ? Math.round(donateEuros * 100) : NaN;
  const partialValid = Number.isInteger(donateCents) && donateCents > 0 && donateCents < amountCents;

  return (
    <div className="mt-6 flex flex-col gap-3">
      <form
        action={chooseCancellationOption}
        onSubmit={(e) => {
          if (!window.confirm(`Weet je zeker dat je ${amountLabel} terug wilt ontvangen? Deze keuze kan niet meer worden gewijzigd.`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="choice" value="REFUND" />
        <Button type="submit" size="lg" className="w-full">
          Ik wil mijn geld terug ({amountLabel})
        </Button>
      </form>

      <form
        action={chooseCancellationOption}
        className="flex flex-col gap-2 rounded-xl border border-border p-3"
        onSubmit={(e) => {
          if (
            !partialValid ||
            !window.confirm(
              `Je doneert ${formatEuro(donateCents)} en ontvangt ${formatEuro(amountCents - donateCents)} terug. Deze keuze kan niet meer worden gewijzigd. Doorgaan?`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="choice" value="PARTIAL" />
        <Label htmlFor="donateEuros">Ik doneer een deel en ontvang de rest terug</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm">€</span>
          <Input
            id="donateEuros"
            name="donateEuros"
            type="text"
            inputMode="decimal"
            placeholder="Te doneren bedrag, bv. 5,00"
            value={donateInput}
            onChange={(e) => setDonateInput(e.target.value)}
            className="w-48"
          />
        </div>
        {donateInput !== "" && (
          <p className="text-xs text-muted-foreground">
            {partialValid
              ? `Je doneert ${formatEuro(donateCents)} en ontvangt ${formatEuro(amountCents - donateCents)} terug.`
              : `Vul een bedrag in tussen €0,01 en ${formatEuro(amountCents - 1)}.`}
          </p>
        )}
        <Button type="submit" size="lg" variant="outline" disabled={!partialValid}>
          Deels doneren, rest terug
        </Button>
      </form>

      <form
        action={chooseCancellationOption}
        onSubmit={(e) => {
          if (!window.confirm(`Weet je zeker dat je ${amountLabel} doneert aan het goede doel? Je krijgt dan niets terug en deze keuze kan niet meer worden gewijzigd.`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="choice" value="DONATE" />
        <Button type="submit" size="lg" variant="outline" className="w-full">
          Ik doneer het hele bedrag aan het goede doel
        </Button>
      </form>
    </div>
  );
}
