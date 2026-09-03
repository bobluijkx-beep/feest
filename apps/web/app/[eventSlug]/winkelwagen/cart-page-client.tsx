"use client";

import Link from "next/link";
import { Button, Card, CardContent, buttonVariants } from "@lions/ui";
import { useCart } from "../cart-context";
import { QuantityInput } from "../quantity-input";

export function CartPageClient({ eventSlug, hasMerchandise }: { eventSlug: string; hasMerchandise: boolean }) {
  const { items, updateQuantity, removeItem, totalCents } = useCart();

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

  // Alleen relevant zolang de koper uitsluitend tickets heeft — zodra er al een
  // feestartikel in de winkelwagen ligt (of het event er geen heeft) is de melding
  // overbodig en verdwijnt hij vanzelf.
  const onlyTickets = hasMerchandise && items.every((item) => item.kind === "TICKET");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:max-w-4xl lg:max-w-6xl">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl">Winkelwagen</h1>

        {onlyTickets && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
            <span>
              Je hebt alleen tickets in je winkelwagen — vergeet je de feestartikelen niet? Denk aan een petje of
              waaier voor erbij.
            </span>
            <Link href={`/${eventSlug}/producten#feestartikelen`} className={buttonVariants({ size: "sm", variant: "outline" })}>
              Bekijk feestartikelen
            </Link>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.productId}>
              <CardContent className="flex items-center gap-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="size-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">€{(item.priceCents / 100).toFixed(2)}</p>
                </div>
                {/* Een donatie heeft altijd quantity 1 tegen een zelfgekozen bedrag — een
                    stapper zou dat bedrag alleen maar vermenigvuldigen, verwarrender dan
                    nuttig. Bedrag wijzigen kan via de donatiemodule op /producten. */}
                {item.kind !== "DONATION" && (
                  <QuantityInput value={item.quantity} onChange={(q) => updateQuantity(item.productId, q)} min={0} />
                )}
                <Button variant="ghost" size="sm" onClick={() => removeItem(item.productId)}>
                  Verwijderen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm font-medium">
          <span>Subtotaal</span>
          <span>€{(totalCents / 100).toFixed(2)}</span>
        </div>

        <Link href={`/${eventSlug}/afrekenen`} className={buttonVariants({ size: "lg", className: "mt-6 w-full" })}>
          Verder naar afrekenen
        </Link>
      </div>
    </main>
  );
}
