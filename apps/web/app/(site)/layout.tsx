import { cn, Starfield } from "@lions/ui";
import { getPublicEvent } from "@/lib/get-event";
import { getEventThemeStyle } from "@/lib/event-theme-style";
import { HOME_EVENT_SLUG } from "@/lib/site-config";
import { CartProvider } from "../[eventSlug]/cart-context";
import { StorefrontHeader } from "../[eventSlug]/storefront-header";

// Voorkomt dat Next.js deze route-groep tijdens `next build` probeert statisch te
// prerenderen: getPublicEvent hieronder doet een echte databasequery, en Turborepo geeft
// DATABASE_URL/DIRECT_URL (bewust) niet door aan de build-stap (alleen aan runtime) — een
// statische prerender-poging faalt daar dus op. De event-pagina's ([eventSlug]/*) hebben
// dit probleem niet: die zijn door hun dynamische route-segment sowieso al altijd
// server-rendered on demand, nooit statisch.
export const dynamic = "force-dynamic";

/** Layout voor de "(site)"-routegroep: de niet-event-gebonden pagina's (/, /contact,
 * /afmelden). Een routegroep-map (haakjes) telt niet mee in de URL. Deze pagina's horen
 * bij geen eigen event, maar HOME_EVENT_SLUG (lib/site-config.ts) fungeert in de praktijk
 * als "de" homepage van de site — dus krijgen deze pagina's exact dezelfde huisstijl +
 * kopbalk als die event-pagina ([eventSlug]/layout.tsx), i.p.v. een eigen, afwijkende
 * look. CartProvider met dezelfde eventSlug zorgt dat de winkelwagen-teller in de kopbalk
 * ook hier klopt (zelfde localStorage-sleutel als op /feest/*). */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const homeEvent = await getPublicEvent(HOME_EVENT_SLUG);

  // Zou het homepage-event ooit niet bestaan/gepubliceerd zijn, dan nog steeds een
  // werkende (alleen kaler) pagina tonen i.p.v. een 404 op /contact of /afmelden.
  if (!homeEvent) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  const { style, isDark, logoUrl } = getEventThemeStyle(homeEvent.theme);

  return (
    <div className={cn("min-h-screen bg-background text-foreground", isDark && "dark")} style={style}>
      {isDark && <Starfield />}
      <div className="relative z-0">
        <CartProvider eventSlug={HOME_EVENT_SLUG}>
          <StorefrontHeader eventSlug={HOME_EVENT_SLUG} eventName={homeEvent.name} logoUrl={logoUrl} />
          {children}
        </CartProvider>
      </div>
    </div>
  );
}
