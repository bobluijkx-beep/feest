import "server-only";
import { prisma } from "../db";

/** Som van "nog te koop" over alle kind=TICKET-producten van een event: totalStock -
 * reservedStock - soldStock per product (zelfde beschikbaarheidsberekening als
 * create-order.ts), nooit negatief per product meegeteld. Gebruikt door het
 * "beschikbaarheid"-paginablok (packages/ui/src/page-block-view.tsx) om een live
 * "Nog xxx toegangskaarten beschikbaar"-tekst te tonen op de publieke eventpagina. */
export async function getAvailableTicketCount(eventId: string): Promise<number> {
  const ticketProducts = await prisma.product.findMany({
    where: { eventId, kind: "TICKET" },
    select: { totalStock: true, reservedStock: true, soldStock: true },
  });
  return ticketProducts.reduce(
    (sum, p) => sum + Math.max(p.totalStock - p.reservedStock - p.soldStock, 0),
    0,
  );
}
