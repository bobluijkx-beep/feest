"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Button, Card, CardContent, Input, Label, buttonVariants } from "@lions/ui";
import { useCart } from "../cart-context";
import { startCheckout } from "../actions";

export function CheckoutForm({
  eventId,
  eventSlug,
  error,
}: {
  eventId: string;
  eventSlug: string;
  error?: string;
}) {
  const { items, totalCents } = useCart();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center md:max-w-4xl lg:max-w-6xl">
        <p className="text-sm text-muted-foreground">Je winkelwagen is leeg.</p>
        <Link href={`/${eventSlug}/producten`} className={buttonVariants({ className: "mt-4" })}>
          Bekijk producten
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:max-w-4xl lg:max-w-6xl">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl">Afrekenen</h1>

        <form action={startCheckout} className="mt-6 flex flex-col gap-6">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="eventSlug" value={eventSlug} />
          {items.map((item) => (
            <Fragment key={item.productId}>
              <input type="hidden" name={`qty_${item.productId}`} value={item.quantity} />
              {item.kind === "DONATION" && (
                <input type="hidden" name={`amount_${item.productId}`} value={item.priceCents} />
              )}
            </Fragment>
          ))}

          <Card>
            <CardContent className="flex flex-col gap-2">
              <h2 className="font-heading text-base font-medium">Overzicht</h2>
              {items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-sm">
                  {/* Een donatie heeft geen zinvolle "aantal x"-weergave — het is altijd
                      quantity 1 tegen een zelfgekozen bedrag, geen aantal keer eenzelfde
                      vaste prijs. */}
                  <span>{item.kind === "DONATION" ? item.name : `${item.quantity}x ${item.name}`}</span>
                  <span>€{((item.priceCents * item.quantity) / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-medium">
                <span>Totaal</span>
                <span>€{(totalCents / 100).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {error === "stock" && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Helaas, er zijn niet meer genoeg artikelen van (één van) de gekozen soorten beschikbaar. Pas je
              winkelwagen aan.
            </p>
          )}
          {error === "unknown" && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Er ging iets mis bij het starten van de betaling. Probeer het opnieuw.
            </p>
          )}

          <Card>
            <CardContent className="flex flex-col gap-4">
              <h2 className="font-heading text-base font-medium">Jouw gegevens</h2>
              <div className="flex flex-col gap-2">
                <Label htmlFor="buyerName">Naam</Label>
                <Input id="buyerName" name="buyerName" type="text" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="buyerEmail">E-mailadres</Label>
                <Input id="buyerEmail" name="buyerEmail" type="email" required />
              </div>
              <div className="flex items-start gap-2">
                <input
                  id="marketingOptIn"
                  name="marketingOptIn"
                  type="checkbox"
                  defaultChecked
                  className="mt-1 size-4 shrink-0 rounded border-input"
                />
                <Label htmlFor="marketingOptIn" className="text-sm font-normal text-muted-foreground">
                  Ja, ik wil op de hoogte blijven van nieuws, acties en evenementen van Lionsclub Voorschoten via
                  e-mail. Je kunt je op elk moment weer afmelden.
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* bg-primary/text-primary-foreground i.p.v. de eerdere accent-kleuren: --accent
              wordt per event overschreven (bv. dit event zet 'm op een licht zilver) maar
              --accent-foreground niet mee, wat hier op donkere thema's een nauwelijks
              leesbare lichte-op-lichte combinatie opleverde. primary/primary-foreground is
              wél altijd als bij elkaar passend paar ontworpen (zie de toelichting in
              layout.tsx over donkere thema's). */}
          <Button type="submit" size="lg">
            Afrekenen met iDeal
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/payment-badges/ideal-wero.jpg"
            alt="Betalen kan via iDEAL of Wero"
            className="mx-auto h-9 w-auto rounded-md"
          />
        </form>
      </div>
    </main>
  );
}
