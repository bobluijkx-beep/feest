import "server-only";
import { prisma } from "../db";
import type { TierGroupConfig } from "./tiers";

/** Staffelgroepen van een event als platte, serialiseerbare config — voor de winkelwagen in de
 * browser (cart-context.tsx), die er dezelfde berekening mee doet als createOrder(). */
export async function getTierGroupConfigs(eventId: string): Promise<TierGroupConfig[]> {
  const groups = await prisma.priceTierGroup.findMany({
    where: { eventId },
    include: { tiers: true },
    orderBy: { createdAt: "asc" },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    mode: g.mode,
    freeEvery: g.freeEvery,
    tiers: g.tiers.map((t) => ({ quantity: t.quantity, totalCents: t.totalCents })),
  }));
}
