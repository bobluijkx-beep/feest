import Link from "next/link";
import { prisma } from "@lions/core";
import { Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { OrderDetailDialog } from "../order-detail-dialog";
import { CheckInSummary } from "../checkin-summary";
import { ReactivateOrderButton } from "../reactivate-order-button";
import { DeleteOrderButton } from "../delete-order-button";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
  REFUNDED: "outline",
};

/** Afdeling "Inactief": bestellingen die met "Op inactief zetten" uit het standaardoverzicht
 * zijn gehaald. Alleen hiervandaan kan een order weer actief gemaakt worden, of — uitsluitend
 * ADMIN — definitief verwijderd worden. */
export default async function InactiveOrdersPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const orders = await prisma.order.findMany({
    where: { isVisible: false },
    orderBy: { updatedAt: "desc" },
    include: { items: true, tickets: { include: { checkIns: true } }, event: true },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">Inactieve bestellingen</h1>
          <p className="text-sm text-muted-foreground">
            Verborgen uit het standaardoverzicht. Definitief verwijderen kan alleen hier.
          </p>
        </div>
        <Link href="/orders" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          ← Terug naar actieve bestellingen
        </Link>
      </div>
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Koper</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Tickets</TableHead>
          <TableHead>Ingecheckt</TableHead>
          <TableHead className="text-right">Totaal</TableHead>
          <TableHead>Besteld op</TableHead>
          <TableHead>Acties</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <div>{order.buyerName}</div>
              <div className="text-xs text-muted-foreground">{order.buyerEmail}</div>
            </TableCell>
            <TableCell>{order.event.name}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>{order.status}</Badge>
            </TableCell>
            <TableCell className="text-right">
              {order.tickets.length || order.items.reduce((sum, item) => sum + item.quantity, 0)}
            </TableCell>
            <TableCell>
              <CheckInSummary tickets={order.tickets} />
            </TableCell>
            <TableCell className="text-right">€{(order.totalCents / 100).toFixed(2)}</TableCell>
            <TableCell>{order.createdAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</TableCell>
            <TableCell>
              <div className="flex flex-col items-start gap-1">
                <OrderDetailDialog orderId={order.id} />
                <ReactivateOrderButton orderId={order.id} />
                {actor.role === "ADMIN" && <DeleteOrderButton orderId={order.id} />}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {orders.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground">
              Geen inactieve bestellingen.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      </Table>
    </div>
  );
}
