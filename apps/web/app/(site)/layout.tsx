import { Starfield } from "@lions/ui";
import { SiteHeader } from "./site-header";

/** Layout voor de "(site)"-routegroep: de niet-event-gebonden pagina's (/, /contact,
 * /afmelden). Een routegroep-map (haakjes) telt niet mee in de URL — dit is dus puur om
 * deze paar pagina's een eigen, gedeelde kopbalk te geven zonder de event-pagina's
 * ([eventSlug]/layout.tsx, met hun eigen thema/StorefrontHeader) te raken.
 *
 * Altijd het donkere thema (.dark, packages/ui/src/theme.css) — deze pagina's horen bij
 * geen specifiek event en hebben dus geen eigen Event.theme om op terug te vallen; het
 * lichte standaardthema oogde daardoor "los" van de rest van de (op dit moment: donkere)
 * site. Net als bij een donker event-thema ([eventSlug]/layout.tsx) hoort de sterrenhemel
 * erbij. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Starfield />
      <div className="relative z-0">
        <SiteHeader />
        {children}
      </div>
    </div>
  );
}
