import "server-only";
import { prisma } from "../db";

type VisibilityResult = { ok: true } | { ok: false; error: string };

/** Zet een order op "inactief" in de admin: dit is puur een zichtbaarheids-vlag
 * (`Order.isVisible`) om de regel uit het standaardoverzicht te halen — het raakt bewust
 * geen `status`, tickets of voorraad aan. Een echte annulering/terugbetaling loopt via de
 * aparte Terugbetalen-actie (refundOrder.ts); permanent verwijderen kan pas vanuit de
 * "Inactief"-afdeling (deleteTestOrder.ts). */
export async function setOrderVisibility(orderId: string, isVisible: boolean): Promise<VisibilityResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Bestelling niet gevonden." };

  await prisma.order.update({ where: { id: orderId }, data: { isVisible } });

  return { ok: true };
}
