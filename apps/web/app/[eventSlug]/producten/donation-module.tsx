"use client";

import { useState } from "react";
import { Button, Card, CardContent, Input, Label } from "@lions/ui";
import { useCart } from "../cart-context";

// Moet gelijk blijven aan MIN_DONATION_CENTS in packages/core/src/checkout/donation.ts —
// hier client-side gedupliceerd i.p.v. geïmporteerd, want "@lions/core" sleept @lions/db
// (Prisma) mee, wat niet in de browserbundel thuishoort. Puur een UX-vooraankondiging:
// createOrder() controleert elk bedrag hoe dan ook opnieuw, server-side, ongeacht deze
// check hier.
const MIN_DONATION_CENTS = 250;

function formatEuros(cents: number): string {
  const euros = cents / 100;
  return Number.isInteger(euros) ? `€${euros}` : `€${euros.toFixed(2)}`;
}

export function DonationModule({
  productId,
  name,
  imageUrl,
  descriptionHtml,
  presetsCents,
}: {
  productId: string;
  name: string;
  imageUrl: string | null;
  descriptionHtml: string | null;
  presetsCents: number[];
}) {
  const { items, setItem, removeItem } = useCart();
  const inCart = items.find((i) => i.productId === productId);

  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customEuros, setCustomEuros] = useState("");
  const [added, setAdded] = useState(false);

  const customCents = Math.round(Number(customEuros.replace(",", ".")) * 100);
  const customValid = customEuros !== "" && Number.isFinite(customCents) && customCents >= MIN_DONATION_CENTS;
  const chosenCents = customMode ? (customValid ? customCents : null) : selectedPreset;

  function pickPreset(cents: number) {
    setCustomMode(false);
    setCustomEuros("");
    setSelectedPreset(cents);
    setAdded(false);
  }

  function pickCustom() {
    setCustomMode(true);
    setSelectedPreset(null);
    setAdded(false);
  }

  function handleSubmit() {
    if (!chosenCents) return;
    setItem({ productId, name, imageUrl, kind: "DONATION", priceCents: chosenCents }, 1);
    setAdded(true);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {descriptionHtml && (
          // descriptionHtml komt uit de admin-HtmlEditor (products/create-product-form.tsx,
          // product-row-form.tsx) — mag dus vet/kop/link bevatten, zelfde afweging als de
          // event-omschrijving en de hero-subtitel.
          <div
            className="text-sm text-foreground [&_a]:underline [&_a]:underline-offset-2"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}

        <div className="flex flex-wrap gap-2">
          {presetsCents.map((cents) => (
            <Button
              key={cents}
              type="button"
              variant={!customMode && selectedPreset === cents ? "default" : "outline"}
              onClick={() => pickPreset(cents)}
            >
              {formatEuros(cents)}
            </Button>
          ))}
          <Button type="button" variant={customMode ? "default" : "outline"} onClick={pickCustom}>
            Ander bedrag
          </Button>
        </div>

        {customMode && (
          <div className="flex flex-col gap-1">
            <Label htmlFor={`custom-amount-${productId}`}>Bedrag (minimaal €2,50)</Label>
            <Input
              id={`custom-amount-${productId}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="2.50"
              value={customEuros}
              onChange={(e) => {
                setCustomEuros(e.target.value);
                setAdded(false);
              }}
              className="w-32"
            />
            {customEuros !== "" && !customValid && <p className="text-xs text-destructive">Minimaal €2,50.</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={!chosenCents} onClick={handleSubmit}>
            {inCart ? "Bedrag aanpassen" : "In winkelwagen"}
          </Button>
          {inCart && (
            <>
              <span className="text-sm text-muted-foreground">Huidige donatie: {formatEuros(inCart.priceCents)}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(productId)}>
                Verwijderen
              </Button>
            </>
          )}
          {added && <span className="text-sm text-primary">Toegevoegd!</span>}
        </div>
      </CardContent>
    </Card>
  );
}
