"use client";

import Link from "next/link";
import { useCart } from "./cart-context";

export function StorefrontHeader({
  eventSlug,
  eventName,
  logoUrl,
}: {
  eventSlug: string;
  eventName: string;
  logoUrl?: string;
}) {
  const { totalCount } = useCart();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-2 md:max-w-4xl lg:max-w-6xl">
        <Link href={`/${eventSlug}`} className="flex items-center gap-3 font-display text-lg">
          {/* Bewust groter dan de tekstregel eromheen (niet meer tekst-uitgelijnd) —
              anders is het logo onleesbaar klein. */}
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-28 w-auto shrink-0" />
          )}
          {eventName}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href={`/${eventSlug}/producten`} className="hover:text-primary">
            Producten
          </Link>
          <Link href={`/${eventSlug}/winkelwagen`} className="hover:text-primary">
            Winkelwagen{totalCount > 0 ? ` (${totalCount})` : ""}
          </Link>
        </nav>
      </div>
    </header>
  );
}
