import { notFound } from "next/navigation";
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
  if (primaryColor) themeOverrides["--primary"] = primaryColor;
  if (backgroundColor) themeOverrides["--background"] = backgroundColor;
  if (accentColor) themeOverrides["--accent"] = accentColor;

  return (
    <div className="min-h-screen bg-background" style={themeOverrides as React.CSSProperties}>
      <CartProvider eventSlug={eventSlug}>
        <StorefrontHeader eventSlug={eventSlug} eventName={event.name} logoUrl={logoUrl} />
        {children}
      </CartProvider>
    </div>
  );
}
