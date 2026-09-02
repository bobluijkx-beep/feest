import Link from "next/link";

/** Gedeelde kopbalk voor de niet-event-gebonden pagina's (startpagina, contact, afmelden
 * — de "(site)"-routegroep, zie layout.tsx hiernaast). Bewust dezelfde opbouw als
 * StorefrontHeader ([eventSlug]/storefront-header.tsx) — sticky, backdrop-blur, dezelfde
 * max-w-breakpoints — zodat het overstappen tussen een event-pagina en bv. /contact niet
 * als een andere website aanvoelt. Geen logo/winkelwagen hier: die zijn per event
 * ingesteld en hebben op deze algemene pagina's geen betekenis. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 md:max-w-4xl lg:max-w-6xl">
        <Link href="/" className="font-display text-lg">
          Lionsclub Voorschoten
        </Link>
        <nav className="flex shrink-0 items-center gap-4 text-sm">
          <Link href="/contact" className="hover:text-primary">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
