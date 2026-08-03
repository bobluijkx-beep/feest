import Link from "next/link";
import { cn } from "@lions/ui";

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
    <div className="flex flex-wrap gap-4">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`${basePath}?eventId=${event.id}`}
          className={cn(
            "text-sm",
            event.id === selectedId ? "font-semibold text-foreground" : "font-normal text-muted-foreground",
          )}
        >
          {event.name}
        </Link>
      ))}
    </div>
  );
}
