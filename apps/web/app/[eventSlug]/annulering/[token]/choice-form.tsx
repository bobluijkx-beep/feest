"use client";

import { Button } from "@lions/ui";
import { chooseCancellationOption } from "../actions";

/** Eén knop per keuze, elk een eigen formulier met een bevestigingsvraag — de keuze staat na
 * het versturen onherroepelijk vast (zie submitCancellationChoice), dus voorkomen we een
 * misklik met een expliciete window.confirm. */
export function ChoiceForm({ token, amountLabel }: { token: string; amountLabel: string }) {
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
        onSubmit={(e) => {
          if (!window.confirm(`Weet je zeker dat je ${amountLabel} doneert aan het goede doel? Je krijgt dan niets terug en deze keuze kan niet meer worden gewijzigd.`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="choice" value="DONATE" />
        <Button type="submit" size="lg" variant="outline" className="w-full">
          Ik doneer het bedrag aan het goede doel
        </Button>
      </form>
    </div>
  );
}
