"use client";

import { useRouter } from "next/navigation";
import { Select } from "@lions/ui";

export function EventFilter({
  events,
  selectedId,
}: {
  events: { id: string; name: string }[];
  selectedId?: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={selectedId ?? ""}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `/orders?eventId=${value}` : "/orders");
      }}
      className="w-64"
    >
      <option value="">Alle evenementen</option>
      {events.map((event) => (
        <option key={event.id} value={event.id}>
          {event.name}
        </option>
      ))}
    </Select>
  );
}
