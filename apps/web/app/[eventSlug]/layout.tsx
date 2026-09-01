import { notFound } from "next/navigation";
import { cn, Starfield } from "@lions/ui";
import { getPublicEvent } from "@/lib/get-event";
import { CartProvider } from "./cart-context";
import { StorefrontHeader } from "./storefront-header";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const event = await getPublicEvent(eventSlug);
  if (!event) notFound();

  // Per-event huisstijl (ingesteld via /events) overschrijft de gedeelde design-tokens
  // (zelfde variabelen als packages/ui/src/theme.css) — geldt nu op alle pagina's van het
  // event (producten/winkelwagen/afrekenen/bedankt), niet meer alleen de landingspagina.
  const themeRaw = isRecord(event.theme) ? event.theme : {};
  const themeOverrides: Record<string, string> = {};
  const primaryColor = str(themeRaw.primaryColor);
  const backgroundColor = str(themeRaw.backgroundColor);
  const accentColor = str(themeRaw.accentColor);
  const logoUrl = str(themeRaw.logoUrl);
  const isDark = themeRaw.dark === "true";
  if (primaryColor) themeOverrides["--primary"] = primaryColor;
  if (backgroundColor) themeOverrides["--background"] = backgroundColor;
  if (accentColor) themeOverrides["--accent"] = accentColor;

  // Bij "donker thema" hergebruiken we bewust de bestaande .dark-klasse uit
  // packages/ui/src/theme.css i.p.v. losse tokens te overschrijven — die klasse geeft al
  // een correct op elkaar afgestemde set (foreground/card/muted-foreground/border/input
  // etc.), inclusief een primary-foreground die al bedoeld is om op een lichte primary op
  // een donkere pagina te staan. primary/accent hierboven overschrijven daarna alsnog de
  // tint (bv. richting zilver) zonder de rest van de balans te breken.
  return (
    <div
      className={cn("min-h-screen bg-background text-foreground", isDark && "dark")}
      style={themeOverrides as React.CSSProperties}
    >
      {/* Alleen bij donker thema — een sterrenhemel past niet bij een lichte huisstijl
          (bv. de oliebollenverkoop). position: fixed, z-0: blijft op zijn plek terwijl de
          pagina scrolt, "achter" de content. */}
      {isDark && <Starfield />}
      {/* relative z-0: zonder positionering valt dit in-flow blok in een eerdere
          CSS-schilderfase dan de hierboven positioneerde (z-0) sterrenhemel, en zou het er
          dus ONDER komen te liggen i.p.v. erboven — zelfde eigenaardigheid als eerder al
          uitgezocht bij HeroFrame (packages/ui/src/components/hero-frame.tsx). Expliciet
          op hetzelfde stackniveau zetten lost het op (DOM-volgorde bepaalt dan, en dit
          staat na de sterrenhemel). */}
      <div className="relative z-0">
        <CartProvider eventSlug={eventSlug}>
          <StorefrontHeader eventSlug={eventSlug} eventName={event.name} logoUrl={logoUrl} />
          {children}
        </CartProvider>
      </div>
    </div>
  );
}
