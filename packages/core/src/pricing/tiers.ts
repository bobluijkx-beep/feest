// Bewust zonder "server-only" en zonder imports: dezelfde berekening draait in createOrder()
// (de echte, doorslaggevende prijs) én in de winkelwagen in de browser (alleen weergave), zodat
// beide altijd hetzelfde totaal laten zien.

export type TierMode = "EVERY_NTH_FREE" | "TIER_TABLE";

export interface TierGroupConfig {
  id: string;
  name: string;
  mode: TierMode;
  /** Alleen bij EVERY_NTH_FREE: elke N-de stuk is gratis. */
  freeEvery: number | null;
  /** Alleen bij TIER_TABLE: totaalprijs (in centen) voor precies dat aantal. */
  tiers: { quantity: number; totalCents: number }[];
}

export interface TierLine {
  /** Vrije sleutel om de regel in het resultaat terug te vinden (bv. productId). */
  key: string;
  quantity: number;
  unitPriceCents: number;
}

export interface TierResult {
  totalCents: number;
  undiscountedCents: number;
  /** Toegewezen deel van totalCents per regel (som = totalCents). */
  perLineCents: Map<string, number>;
}

const MAX_TIER_QUANTITY = 5000;

function sumUndiscounted(lines: TierLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
}

/** Elke N-de stuk gratis, over alle stuks van de groep samen. Bij verschillende stukprijzen zijn
 * de gratis stuks de goedkoopste (de klant heeft er geen voordeel van dat dit anders gaat). */
function everyNthFree(freeEvery: number, lines: TierLine[]): number {
  const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
  let freeLeft = freeEvery >= 2 ? Math.floor(totalQty / freeEvery) : 0;
  let total = sumUndiscounted(lines);
  for (const line of [...lines].sort((a, b) => a.unitPriceCents - b.unitPriceCents)) {
    const free = Math.min(freeLeft, line.quantity);
    total -= free * line.unitPriceCents;
    freeLeft -= free;
  }
  return total;
}

/** Staffellijst "aantal → totaalprijs": het goedkoopste totaal voor n stuks door de genoemde
 * aantallen te combineren met losse stuks tegen de normale prijs (bv. met 5 → €4 en 10 → €7,50
 * kost 25 stuks 2×10 + 5). Dat maakt 10 + 10 stuks (ook over meerdere producten van de groep)
 * precies de prijs van 20 uit de lijst, en een aantal tússen twee staffels redelijk (nooit
 * duurder dan de normale prijs). */
function cheapestTierTotal(tiers: TierGroupConfig["tiers"], totalQty: number, undiscounted: number): number {
  if (totalQty <= 0 || totalQty > MAX_TIER_QUANTITY) return undiscounted;
  const single = undiscounted / totalQty;
  const usable = tiers.filter((t) => t.quantity >= 1 && t.totalCents >= 0);
  const best: number[] = new Array(totalQty + 1).fill(0);
  for (let i = 1; i <= totalQty; i++) {
    let min = best[i - 1] + single;
    for (const t of usable) {
      if (t.quantity <= i) min = Math.min(min, best[i - t.quantity] + t.totalCents);
    }
    best[i] = min;
  }
  return Math.min(Math.round(best[totalQty]), undiscounted);
}

/** Verdeelt `total` over de gewichten (largest remainder): de som is altijd exact `total`. */
function allocate(total: number, weights: { key: string; weight: number }[]): Map<string, number> {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  const result = new Map<string, number>();
  if (totalWeight <= 0) {
    for (const w of weights) result.set(w.key, 0);
    return result;
  }
  const parts = weights.map((w) => {
    const exact = (total * w.weight) / totalWeight;
    return { key: w.key, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = total - parts.reduce((sum, p) => sum + p.cents, 0);
  for (const p of parts) result.set(p.key, p.cents);
  for (const p of [...parts].sort((a, b) => b.remainder - a.remainder)) {
    if (remaining <= 0) break;
    result.set(p.key, (result.get(p.key) ?? 0) + 1);
    remaining--;
  }
  return result;
}

/** Prijs voor alle regels van één staffelgroep samen (de stuks worden over de producten heen
 * opgeteld). Het totaal is nooit hoger dan de normale prijs. */
export function priceTierGroup(config: TierGroupConfig, lines: TierLine[]): TierResult {
  const active = lines.filter((l) => l.quantity > 0);
  const undiscountedCents = sumUndiscounted(active);
  const totalQty = active.reduce((sum, l) => sum + l.quantity, 0);

  let totalCents = undiscountedCents;
  if (config.mode === "EVERY_NTH_FREE" && config.freeEvery) {
    totalCents = everyNthFree(config.freeEvery, active);
  } else if (config.mode === "TIER_TABLE") {
    totalCents = cheapestTierTotal(config.tiers, totalQty, undiscountedCents);
  }
  totalCents = Math.max(0, Math.min(totalCents, undiscountedCents));

  const perLineCents = allocate(
    totalCents,
    active.map((l) => ({ key: l.key, weight: l.quantity * l.unitPriceCents })),
  );
  return { totalCents, undiscountedCents, perLineCents };
}

/** Een regel van `quantity` stuks met een toegewezen totaal van `lineCents` kan niet altijd met één
 * eenheidsprijs exact worden uitgedrukt (bv. €8,75 voor 10 stuks). Splitst daarom in maximaal twee
 * OrderItem-regels (r stuks één cent duurder) zodat eenheidsprijs × aantal precies klopt. */
export function splitLineCents(quantity: number, lineCents: number): { quantity: number; unitPriceCents: number }[] {
  if (quantity <= 0) return [];
  const base = Math.floor(lineCents / quantity);
  const dearer = lineCents - base * quantity;
  const parts: { quantity: number; unitPriceCents: number }[] = [];
  if (dearer > 0) parts.push({ quantity: dearer, unitPriceCents: base + 1 });
  if (quantity - dearer > 0) parts.push({ quantity: quantity - dearer, unitPriceCents: base });
  return parts;
}

function euro(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/** Korte uitleg voor op de productpagina en in de winkelwagen. */
export function describeTierGroup(config: TierGroupConfig): string {
  if (config.mode === "EVERY_NTH_FREE" && config.freeEvery) {
    return `Elke ${config.freeEvery}e gratis`;
  }
  const tiers = [...config.tiers].sort((a, b) => a.quantity - b.quantity);
  return tiers.map((t) => `${t.quantity} voor ${euro(t.totalCents)}`).join(" · ");
}
