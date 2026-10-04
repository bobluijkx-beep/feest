"use client";

import { useState } from "react";
import { Button, Input, Label } from "@lions/ui";
import { chooseCancellationOption } from "../actions";

function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

const optionClassName = "flex flex-col gap-2 rounded-xl border border-border p-4";

// Wit met zwarte letters, ook op het donkere event-thema (de dark:-varianten overschrijven de
// standaard donkere knop-/invoerstijl uit @lions/ui).
const whiteButtonClassName =
  "w-full border-neutral-300 bg-white text-black hover:bg-neutral-100 hover:text-black dark:border-neutral-300 dark:bg-white dark:text-black dark:hover:bg-neutral-100 dark:hover:text-black";
const whiteInputClassName =
  "w-48 border-neutral-300 bg-white text-black placeholder:text-neutral-500 dark:bg-white";

/** Drie gelijkwaardige keuzes (1 doneren, 2 deels doneren, 3 terugstorten): bewust dezelfde
 * knopstijl en geen voorselectie, zodat geen enkele keuze visueel boven de andere uitsteekt. Elke
 * keuze is een eigen formulier met een bevestigingsvraag — de keuze staat na het versturen
 * onherroepelijk vast (zie submitCancellationChoice). De knop van keuze 2 is bewust nooit
 * "disabled" (dat zou 'm er anders uit laten zien); een ongeldig bedrag geeft een melding. */
export function ChoiceForm({ token, amountCents }: { token: string; amountCents: number }) {
  const amountLabel = formatEuro(amountCents);
  const [donateInput, setDonateInput] = useState("");
  const [showAmountError, setShowAmountError] = useState(false);

  const donateEuros = Number(donateInput.replace(",", "."));
  const donateCents = Number.isFinite(donateEuros) ? Math.round(donateEuros * 100) : NaN;
  const partialValid = Number.isInteger(donateCents) && donateCents > 0 && donateCents < amountCents;

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-sm font-medium">Je hebt drie mogelijkheden. Kies er één:</p>

      <form
        action={chooseCancellationOption}
        className={optionClassName}
        onSubmit={(e) => {
          if (!window.confirm(`Weet je zeker dat je ${amountLabel} doneert aan het goede doel? Je krijgt dan niets terug en deze keuze kan niet meer worden gewijzigd.`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="choice" value="DONATE" />
        <p className="font-medium">1. Doneren</p>
        <p className="text-xs text-muted-foreground">Het hele bedrag ({amountLabel}) gaat naar het goede doel.</p>
        <Button type="submit" size="lg" variant="outline" className={whiteButtonClassName}>
          Ik doneer het hele bedrag
        </Button>
      </form>

      <form
        action={chooseCancellationOption}
        className={optionClassName}
        onSubmit={(e) => {
          if (!partialValid) {
            e.preventDefault();
            setShowAmountError(true);
            return;
          }
          if (
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
        <p className="font-medium">2. Deels doneren</p>
        <Label htmlFor="donateEuros" className="text-xs font-normal text-muted-foreground">
          Vul in hoeveel je doneert; de rest van de {amountLabel} ontvang je terug.
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm">€</span>
          <Input
            id="donateEuros"
            name="donateEuros"
            type="text"
            inputMode="decimal"
            placeholder="Te doneren bedrag, bv. 5,00"
            value={donateInput}
            onChange={(e) => {
              setDonateInput(e.target.value);
              setShowAmountError(false);
            }}
            className={whiteInputClassName}
          />
        </div>
        {partialValid && (
          <p className="text-xs text-muted-foreground">
            Je doneert {formatEuro(donateCents)} en ontvangt {formatEuro(amountCents - donateCents)} terug.
          </p>
        )}
        {showAmountError && !partialValid && (
          <p className="text-xs text-destructive">
            Vul een bedrag in tussen €0,01 en {formatEuro(amountCents - 1)}.
          </p>
        )}
        <Button type="submit" size="lg" variant="outline" className={whiteButtonClassName}>
          Ik doneer een deel
        </Button>
      </form>

      <form
        action={chooseCancellationOption}
        className={optionClassName}
        onSubmit={(e) => {
          if (!window.confirm(`Weet je zeker dat je ${amountLabel} terug wilt ontvangen? Deze keuze kan niet meer worden gewijzigd.`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="choice" value="REFUND" />
        <p className="font-medium">3. Het hele bedrag terugstorten</p>
        <p className="text-xs text-muted-foreground">Je ontvangt {amountLabel} terug op je rekening.</p>
        <Button type="submit" size="lg" variant="outline" className={whiteButtonClassName}>
          Ik wil het hele bedrag terug
        </Button>
      </form>
    </div>
  );
}
