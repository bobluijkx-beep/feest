import { Badge } from "@lions/ui";

type TicketWithCheckIns = { checkIns: { scannedAt: Date }[] };

/** Compacte incheck-samenvatting voor een orderregel in de tabel: "2/3 ingecheckt" met de
 * laatste inchecktijd als tooltip. Orders zonder tickets (bv. puur merchandise) tonen niets. */
export function CheckInSummary({ tickets }: { tickets: TicketWithCheckIns[] }) {
  if (tickets.length === 0) return <span className="text-muted-foreground">—</span>;

  const checkedIn = tickets.filter((t) => t.checkIns.length > 0);
  const lastScannedAt = checkedIn
    .map((t) => t.checkIns[0]?.scannedAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <Badge
      variant={checkedIn.length === 0 ? "outline" : checkedIn.length === tickets.length ? "default" : "secondary"}
      title={lastScannedAt ? `Laatst ingecheckt: ${lastScannedAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}` : undefined}
    >
      {checkedIn.length}/{tickets.length} ingecheckt
    </Badge>
  );
}
