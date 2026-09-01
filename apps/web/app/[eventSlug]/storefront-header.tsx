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
        <Link href={`/${eventSlug}`} className="flex min-w-0 items-center gap-3 font-display text-lg">
          {/* Bewust groter dan de tekstregel eromheen (niet meer tekst-uitgelijnd) —
              anders is het logo onleesbaar klein. */}
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-32 w-auto shrink-0" />
          )}
          {/* Op mobiel is er naast het (bewust grote) logo en de nav-links te weinig
              ruimte voor een lange eventnaam — die viel dan woord voor woord onder
              elkaar. Vanaf sm: weer zichtbaar, met truncate als extra vangnet voor een
              nog langere naam. min-w-0 hierboven is nodig om truncate in een flexbox
              daadwerkelijk te laten werken (anders krimpt dit element niet onder zijn
              eigen inhoud). */}
          <span className="hidden truncate sm:inline">{eventName}</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-4 text-sm">
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
