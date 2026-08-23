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
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href={`/${eventSlug}`} className="flex items-center gap-2 font-display text-lg">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-8 w-auto" />
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
