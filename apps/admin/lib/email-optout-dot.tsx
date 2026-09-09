/** Rood/groen bolletje dat in één oogopslag toont of dit e-mailadres zich heeft afgemeld
 * voor mailings (EmailOptOut, dezelfde tabel als de afmeldlink in e-mails en de opt-in-
 * checkbox bij het afrekenen gebruiken — zie packages/core/src/email/segment.ts). Bewust
 * letterlijke rood/groen-kleuren i.p.v. de thematokens (bv. --destructive/--primary): dit
 * is een vaste betekenis (afgemeld/niet afgemeld), geen merkkleur die met een thema mag
 * meebewegen. */
export function EmailOptOutDot({ optedOut }: { optedOut: boolean }) {
  const label = optedOut ? "Afgemeld voor e-mail" : "Ontvangt e-mail";
  return (
    <span
      className={`inline-block size-2.5 shrink-0 rounded-full ${optedOut ? "bg-red-500" : "bg-green-500"}`}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}
