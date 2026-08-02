import Link from "next/link";

/** Simpele event-switcher (platte links met ?eventId=...), geen client-JS nodig — past
 * bij de rest van deze admin-app die bewust minimale client-interactiviteit gebruikt.
 * Verschijnt alleen als er meer dan één event is. */
export function EventTabs({
  events,
  selectedId,
  basePath,
}: {
  events: { id: string; name: string }[];
  selectedId: string | undefined;
  basePath: string;
}) {
  if (events.length <= 1) return null;

  return (
    <p style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      {events.map((event) => (
        <Link
          key={event.id}
          href={`${basePath}?eventId=${event.id}`}
          style={{ fontWeight: event.id === selectedId ? "bold" : "normal" }}
        >
          {event.name}
        </Link>
      ))}
    </p>
  );
}
