import "server-only";
import { createEvent, type DateArray } from "ics";

function toDateArray(date: Date): DateArray {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()];
}

export function generateIcsInvite(params: {
  eventName: string;
  description?: string;
  venue: string | null;
  startsAt: Date;
  endsAt: Date | null;
}): string {
  const { error, value } = createEvent({
    title: params.eventName,
    description: params.description,
    location: params.venue ?? undefined,
    start: toDateArray(params.startsAt),
    ...(params.endsAt
      ? { end: toDateArray(params.endsAt) }
      : { duration: { hours: 3 } }),
  });

  if (error || !value) {
    throw new Error(`ICS-bestand kon niet worden gegenereerd: ${error?.message ?? "onbekende fout"}`);
  }
  return value;
}
