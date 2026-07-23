import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { startCheckout } from "./actions";

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
    include: { ticketTypes: { where: { isActive: true }, orderBy: { priceCents: "asc" } } },
  });

  if (!event || event.status !== "PUBLISHED") notFound();

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>{event.name}</h1>
      {event.description && <p>{event.description}</p>}
      <p>
        {event.startsAt.toLocaleDateString("nl-NL", { dateStyle: "full" })}
        {event.venue ? ` — ${event.venue}` : ""}
      </p>

      {error === "stock" && (
        <p style={{ color: "crimson" }}>
          Helaas, er zijn niet meer genoeg tickets van (één van) de gekozen soorten beschikbaar. Pas je aantal aan.
        </p>
      )}
      {error === "unknown" && <p style={{ color: "crimson" }}>Er ging iets mis bij het starten van de betaling. Probeer het opnieuw.</p>}

      <form action={startCheckout}>
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="eventSlug" value={event.slug} />

        <h2>Tickets</h2>
        {event.ticketTypes.length === 0 && <p>Er zijn momenteel geen tickets beschikbaar.</p>}
        {event.ticketTypes.map((type) => {
          const available = type.totalStock - type.reservedStock - type.soldStock;
          return (
            <div key={type.id} style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
              <label style={{ flex: 1 }}>
                {type.name} — €{(type.priceCents / 100).toFixed(2)}
                {type.description && <span> ({type.description})</span>}
              </label>
              <input
                type="number"
                name={`qty_${type.id}`}
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

        <button type="submit">Afrekenen met iDeal</button>
      </form>
    </main>
  );
}
