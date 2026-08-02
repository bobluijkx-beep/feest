import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { PageBlocksList } from "@lions/ui";
import { startCheckout } from "./actions";

const THEME_DEFAULTS = { primaryColor: "#1d4ed8", backgroundColor: "#ffffff", accentColor: "#f59e0b", logoUrl: "" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
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

  const themeRaw = isRecord(event.theme) ? event.theme : {};
  const theme = {
    primaryColor: str(themeRaw.primaryColor, THEME_DEFAULTS.primaryColor),
    backgroundColor: str(themeRaw.backgroundColor, THEME_DEFAULTS.backgroundColor),
    accentColor: str(themeRaw.accentColor, THEME_DEFAULTS.accentColor),
    logoUrl: str(themeRaw.logoUrl, THEME_DEFAULTS.logoUrl),
  };

  const hasTickets = ticketProducts.length > 0;
  const hasProducts = merchProducts.length > 0;

  return (
    <main
      style={
        {
          maxWidth: 640,
          margin: "0 auto",
          padding: "2rem 1rem",
          backgroundColor: theme.backgroundColor,
          "--theme-primary": theme.primaryColor,
          "--theme-accent": theme.accentColor,
        } as React.CSSProperties
      }
    >
      {theme.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={theme.logoUrl} alt="" style={{ maxHeight: 80, marginBottom: "1rem" }} />
      )}
      <h1 style={{ color: "var(--theme-primary)" }}>{event.name}</h1>
      {event.description && <p>{event.description}</p>}
      <p>
        {event.startsAt.toLocaleDateString("nl-NL", { dateStyle: "full", timeZone: "Europe/Amsterdam" })}
        {event.venue ? ` — ${event.venue}` : ""}
      </p>

      {error === "stock" && (
        <p style={{ color: "crimson" }}>
          Helaas, er zijn niet meer genoeg artikelen van (één van) de gekozen soorten beschikbaar. Pas je aantal aan.
        </p>
      )}
      {error === "unknown" && <p style={{ color: "crimson" }}>Er ging iets mis bij het starten van de betaling. Probeer het opnieuw.</p>}

      <PageBlocksList blocks={event.pageBlocks} />

      <form action={startCheckout}>
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="eventSlug" value={event.slug} />

        {hasTickets && (
          <>
            <h2>Tickets</h2>
            {ticketProducts.map((product) => {
              const available = product.totalStock - product.reservedStock - product.soldStock;
              return (
                <div key={product.id} style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                  <label style={{ flex: 1 }}>
                    {product.name} — €{(product.priceCents / 100).toFixed(2)}
                    {product.description && <span> ({product.description})</span>}
                  </label>
                  <input
                    type="number"
                    name={`qty_${product.id}`}
                    min={0}
                    max={Math.max(available, 0)}
                    defaultValue={0}
                    disabled={available <= 0}
                    style={{ width: "4rem" }}
                  />
                  {available <= 0 && <span>Uitverkocht</span>}
                </div>
              );
            })}
          </>
        )}

        {hasProducts && (
          <>
            <h2>Merchandise</h2>
            {merchProducts.map((product) => {
              const available = product.totalStock - product.reservedStock - product.soldStock;
              return (
                <div key={product.id} style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                  <label style={{ flex: 1 }}>
                    {product.name} — €{(product.priceCents / 100).toFixed(2)}
                    {product.description && <span> ({product.description})</span>}
                  </label>
                  <input
                    type="number"
                    name={`qty_${product.id}`}
                    min={0}
                    max={Math.max(available, 0)}
                    defaultValue={0}
                    disabled={available <= 0}
                    style={{ width: "4rem" }}
                  />
                  {available <= 0 && <span>Uitverkocht</span>}
                </div>
              );
            })}
          </>
        )}

        {!hasTickets && !hasProducts && <p>Er zijn momenteel geen artikelen beschikbaar.</p>}

        <h2>Jouw gegevens</h2>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Naam<br />
            <input type="text" name="buyerName" required style={{ width: "100%" }} />
          </label>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>
            E-mailadres<br />
            <input type="email" name="buyerEmail" required style={{ width: "100%" }} />
          </label>
        </div>

        <button type="submit" style={{ backgroundColor: "var(--theme-accent)", color: "#fff", border: "none", padding: "0.6rem 1.2rem" }}>
          Afrekenen met iDeal
        </button>
      </form>
    </main>
  );
}
