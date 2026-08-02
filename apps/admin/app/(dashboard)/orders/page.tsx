import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { RefundButton } from "./refund-button";
import { DeleteOrderButton } from "./delete-order-button";

export default async function OrdersPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, tickets: true, event: true },
    take: 100,
  });

  return (
    <main>
      <h1>Bestellingen</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Koper</th>
            <th align="left">Event</th>
            <th align="left">Status</th>
            <th align="right">Tickets</th>
            <th align="right">Totaal</th>
            <th align="left">Besteld op</th>
            <th align="left">Acties</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>
                {order.buyerName}
                <br />
                <small>{order.buyerEmail}</small>
              </td>
              <td>{order.event.name}</td>
              <td>{order.status}</td>
              <td align="right">
                {order.tickets.length || order.items.reduce((sum, item) => sum + item.quantity, 0)}
              </td>
              <td align="right">€{(order.totalCents / 100).toFixed(2)}</td>
              <td>{order.createdAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</td>
              <td style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {order.status === "PAID" && <RefundButton orderId={order.id} />}
                {actor.role === "ADMIN" && <DeleteOrderButton orderId={order.id} />}
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={7}>Nog geen bestellingen.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
