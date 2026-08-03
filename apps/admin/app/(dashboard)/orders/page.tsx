import { prisma } from "@lions/core";
import { Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { RefundButton } from "./refund-button";
import { DeleteOrderButton } from "./delete-order-button";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
  REFUNDED: "outline",
};

export default async function OrdersPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, tickets: true, event: true },
    take: 100,
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Koper</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Tickets</TableHead>
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
            <TableCell className="text-right">€{(order.totalCents / 100).toFixed(2)}</TableCell>
            <TableCell>{order.createdAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                {order.status === "PAID" && <RefundButton orderId={order.id} />}
                {actor.role === "ADMIN" && <DeleteOrderButton orderId={order.id} />}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {orders.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              Nog geen bestellingen.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
