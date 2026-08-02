const TIME_ZONE = "Europe/Amsterdam";

/** Vercel-serverfunctions draaien in UTC, maar bestuursleden vullen datums/tijden in als
 * lokale (Europe/Amsterdam) wall-clock-tijd via een <input type="datetime-local">. Een
 * naïeve `new Date(value)` zou die string als UTC (of de server-tijdzone) interpreteren —
 * exact de klasse timezone-bug die eerder al eens is gevonden en gefixt in dit project
 * (zie de datum/tijd-weergavefixes elders in de codebase). Deze helper rekent expliciet
 * om vanaf Europe/Amsterdam-wall-clock naar het juiste UTC-instant. */
export function parseAmsterdamDatetimeLocal(value: string): Date {
  const naiveUtc = new Date(`${value}:00Z`);
  const offsetMinutes = getTimeZoneOffsetMinutes(TIME_ZONE, naiveUtc);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60_000);
}

/** Voor het vooraf invullen van een <input type="datetime-local"> met de huidige waarde
 * (bv. bij het bewerken van een bestaand event). */
export function toAmsterdamDatetimeLocalValue(date: Date): string {
  return date.toLocaleString("sv-SE", { timeZone: TIME_ZONE }).slice(0, 16).replace(" ", "T");
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - date.getTime()) / 60_000;
}
