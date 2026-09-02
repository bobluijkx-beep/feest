import { SiteHeader } from "./site-header";

/** Layout voor de "(site)"-routegroep: de niet-event-gebonden pagina's (/, /contact,
 * /afmelden). Een routegroep-map (haakjes) telt niet mee in de URL — dit is dus puur om
 * deze paar pagina's een eigen, gedeelde kopbalk te geven zonder de event-pagina's
 * ([eventSlug]/layout.tsx, met hun eigen thema/StorefrontHeader) te raken. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      {children}
    </div>
  );
}
