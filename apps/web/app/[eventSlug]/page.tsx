import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { PageBlocksList, Card, CardContent, Button, Input, Label } from "@lions/ui";
import { startCheckout } from "./actions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventSlug } = await params;
  const { error } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    include: {
      products: { where: { isActive: true }, orderBy: { priceCents: "asc" } },
      pageBlocks: { where: { isPublished: true }, orderBy: { order: "asc" } },
    },
  });

  if (!event || event.status !== "PUBLISHED") notFound();

  const ticketProducts = event.products.filter((product) => product.kind === "TICKET");
  const merchProducts = event.products.filter((product) => product.kind === "MERCHANDISE");

  // Per-event huisstijl (ingesteld via /events) overschrijft de gedeelde design-tokens
  // (zelfde variabelen als packages/ui/src/theme.css) — alleen de velden die het event
  // echt heeft ingevuld; anders blijft de standaard teal huisstijl gewoon gelden.
  const themeRaw = isRecord(event.theme) ? event.theme : {};
  const themeOverrides: Record<string, string> = {};
  const primaryColor = str(themeRaw.primaryColor);
  const backgroundColor = str(themeRaw.backgroundColor);
  const accentColor = str(themeRaw.accentColor);
  const logoUrl = str(themeRaw.logoUrl);
  if (primaryColor) themeOverrides["--primary"] = primaryColor;
  if (backgroundColor) themeOverrides["--background"] = backgroundColor;
  if (accentColor) themeOverrides["--accent"] = accentColor;

  const hasTickets = ticketProducts.length > 0;
  const hasProducts = merchProducts.length > 0;

  return (
    <main className="min-h-screen bg-background" style={themeOverrides as React.CSSProperties}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mb-4 max-h-20" />
        )}
        <h1 className="text-2xl font-semibold text-primary">{event.name}</h1>
        {event.description && <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>}
        <p className="mt-1 text-sm text-muted-foreground">
          {event.startsAt.toLocaleDateString("nl-NL", { dateStyle: "full", timeZone: "Europe/Amsterdam" })}
          {event.venue ? ` — ${event.venue}` : ""}
        </p>

        {error === "stock" && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Helaas, er zijn niet meer genoeg artikelen van (één van) de gekozen soorten beschikbaar. Pas je aantal aan.
          </p>
        )}
        {error === "unknown" && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Er ging iets mis bij het starten van de betaling. Probeer het opnieuw.
          </p>
        )}

        <div className="mt-6">
          <PageBlocksList blocks={event.pageBlocks} />
        </div>

        <form action={startCheckout} className="mt-6 flex flex-col gap-6">
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="eventSlug" value={event.slug} />

          {hasTickets && (
            <Card>
              <CardContent className="flex flex-col gap-3">
                <h2 className="font-heading text-base font-medium">Tickets</h2>
                {ticketProducts.map((product) => {
                  const available = product.totalStock - product.reservedStock - product.soldStock;
                  return (
                    <div key={product.id} className="flex items-center gap-4">
                      <label className="flex-1 text-sm">
                        {product.name} — €{(product.priceCents / 100).toFixed(2)}
                        {product.description && <span className="text-muted-foreground"> ({product.description})</span>}
                      </label>
                      <Input
                        type="number"
                        name={`qty_${product.id}`}
                        min={0}
                        max={Math.max(available, 0)}
                        defaultValue={0}
                        disabled={available <= 0}
                        className="w-20"
                      />
                      {available <= 0 && <span className="text-xs text-muted-foreground">Uitverkocht</span>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {hasProducts && (
            <Card>
              <CardContent className="flex flex-col gap-3">
                <h2 className="font-heading text-base font-medium">Merchandise</h2>
                {merchProducts.map((product) => {
                  const available = product.totalStock - product.reservedStock - product.soldStock;
                  return (
                    <div key={product.id} className="flex items-center gap-4">
                      <label className="flex-1 text-sm">
                        {product.name} — €{(product.priceCents / 100).toFixed(2)}
                        {product.description && <span className="text-muted-foreground"> ({product.description})</span>}
                      </label>
                      <Input
                        type="number"
                        name={`qty_${product.id}`}
                        min={0}
                        max={Math.max(available, 0)}
                        defaultValue={0}
                        disabled={available <= 0}
                        className="w-20"
                      />
                      {available <= 0 && <span className="text-xs text-muted-foreground">Uitverkocht</span>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {!hasTickets && !hasProducts && <p className="text-sm text-muted-foreground">Er zijn momenteel geen artikelen beschikbaar.</p>}

          <Card>
            <CardContent className="flex flex-col gap-4">
              <h2 className="font-heading text-base font-medium">Jouw gegevens</h2>
              <div className="flex flex-col gap-2">
                <Label htmlFor="buyerName">Naam</Label>
                <Input id="buyerName" name="buyerName" type="text" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="buyerEmail">E-mailadres</Label>
                <Input id="buyerEmail" name="buyerEmail" type="email" required />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/80">
            Afrekenen met iDeal
          </Button>
        </form>
      </div>
    </main>
  );
}
