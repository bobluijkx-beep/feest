// Bewust NIET "server-only": deze constante/validatie is puur en zonder DB-toegang, dus
// ook bruikbaar in het client component dat het "ander bedrag"-veld op de site rendert
// (om alvast lokaal te waarschuwen) — de echte, doorslaggevende controle blijft
// createOrder() in create-order.ts, die dit nooit clientside vertrouwt.

/** Minimumbedrag voor een donatie, in centen (€2,50). Geldt voor zowel een aangeklikte
 * standaardknop als het vrij ingevulde "ander bedrag" — standaardbedragen worden bij het
 * opslaan in de admin (apps/admin/app/(dashboard)/products/actions.ts) ook al tegen deze
 * grens gevalideerd, maar createOrder controleert elk binnenkomend bedrag hier opnieuw
 * tegen, ongeacht of het van een knop of het vrije veld kwam. */
export const MIN_DONATION_CENTS = 250;

export function isValidDonationAmountCents(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_DONATION_CENTS;
}

/** Donaties kennen geen voorraad, maar `totalStock` op Product is een verplichte kolom
 * (het model wordt hergebruikt voor TICKET/MERCHANDISE, waar voorraad wél telt) — de
 * admin-actions zetten dit bij het aanmaken/bewerken van een DONATION-product altijd op
 * deze waarde, ongeacht wat er in het formulier stond, zodat de bestaande
 * beschikbaarheidscontrole in create-order.ts nooit een donatie kan blokkeren. */
export const DONATION_UNLIMITED_STOCK = 1_000_000_000;
