"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from "@lions/ui";
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

type Pending = { choice: "DONATE" | "PARTIAL" | "REFUND"; title: string; lines: string[]; donateEuros?: string };

/** Drie gelijkwaardige keuzes (1 doneren, 2 deels doneren, 3 terugstorten): bewust dezelfde
 * knopstijl en geen voorselectie, zodat geen enkele keuze visueel boven de andere uitsteekt. Een
 * klik opent een grote, gecentreerde bevestigingspop-up met precies wat er gaat gebeuren — de
 * keuze staat na bevestigen onherroepelijk vast (zie submitCancellationChoice). Eén gedeeld
 * formulier in die pop-up verstuurt de gekozen optie; de knop van keuze 2 is bewust nooit
 * "disabled" (dat zou 'm er anders uit laten zien), een ongeldig bedrag geeft een melding. */
export function ChoiceForm({ token, amountCents }: { token: string; amountCents: number }) {
  const amountLabel = formatEuro(amountCents);
  const [donateInput, setDonateInput] = useState("");
  const [showAmountError, setShowAmountError] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const donateEuros = Number(donateInput.replace(",", "."));
  const donateCents = Number.isFinite(donateEuros) ? Math.round(donateEuros * 100) : NaN;
  const partialValid = Number.isInteger(donateCents) && donateCents > 0 && donateCents < amountCents;

  function openPartial() {
    if (!partialValid) {
      setShowAmountError(true);
      return;
    }
    setPending({
      choice: "PARTIAL",
      title: "Deels doneren?",
      lines: [
        `Je doneert ${formatEuro(donateCents)} aan het goede doel.`,
        `Je ontvangt ${formatEuro(amountCents - donateCents)} terug op je rekening.`,
      ],
      donateEuros: donateInput,
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-sm font-medium">Je hebt drie mogelijkheden. Kies er één:</p>

      <div className={optionClassName}>
        <p className="font-medium">1. Doneren</p>
        <p className="text-xs text-muted-foreground">Het hele bedrag ({amountLabel}) gaat naar het goede doel.</p>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className={whiteButtonClassName}
          onClick={() =>
            setPending({
              choice: "DONATE",
              title: "Het hele bedrag doneren?",
              lines: [`Je doneert ${amountLabel} aan het goede doel.`, "Je krijgt niets terug."],
            })
          }
        >
          Ik doneer het hele bedrag
        </Button>
      </div>

      <div className={optionClassName}>
        <p className="font-medium">2. Deels doneren</p>
        <Label htmlFor="donateEuros" className="text-xs font-normal text-muted-foreground">
          Vul in hoeveel je doneert; de rest van de {amountLabel} ontvang je terug.
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm">€</span>
          <Input
            id="donateEuros"
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
          <p className="text-xs text-destructive">Vul een bedrag in tussen €0,01 en {formatEuro(amountCents - 1)}.</p>
        )}
        <Button type="button" size="lg" variant="outline" className={whiteButtonClassName} onClick={openPartial}>
          Ik doneer een deel
        </Button>
      </div>

      <div className={optionClassName}>
        <p className="font-medium">3. Het hele bedrag terugstorten</p>
        <p className="text-xs text-muted-foreground">Je ontvangt {amountLabel} terug op je rekening.</p>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className={whiteButtonClassName}
          onClick={() =>
            setPending({
              choice: "REFUND",
              title: "Het hele bedrag terugstorten?",
              lines: [`Je ontvangt ${amountLabel} terug op de rekening waarmee je hebt betaald.`],
            })
          }
        >
          Ik wil het hele bedrag terug
        </Button>
      </div>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && !submitting && setPending(null)}>
        <DialogContent className="sm:max-w-xl">
          {pending && (
            <form action={chooseCancellationOption} onSubmit={() => setSubmitting(true)} className="flex flex-col gap-8 p-4">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="choice" value={pending.choice} />
              {pending.donateEuros !== undefined && (
                <input type="hidden" name="donateEuros" value={pending.donateEuros} />
              )}
              <DialogHeader className="items-center gap-3 text-center">
                <DialogTitle className="text-3xl leading-tight">{pending.title}</DialogTitle>
                <DialogDescription className="flex flex-col gap-3 text-lg text-foreground">
                  {pending.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  <span className="font-medium">Deze keuze kan daarna niet meer worden gewijzigd.</span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button type="submit" size="lg" className={whiteButtonClassName} disabled={submitting}>
                  {submitting ? "Bezig…" : "Ja, bevestigen"}
                </Button>
                <Button type="button" size="lg" variant="outline" className="w-full" disabled={submitting} onClick={() => setPending(null)}>
                  Terug
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
