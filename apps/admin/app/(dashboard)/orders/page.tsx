import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

export default async function OrdersPage() {
  await requireStaffRole(["ADMIN", "FINANCE"]);

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
              <td>{order.createdAt.toLocaleString("nl-NL")}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={6}>Nog geen bestellingen.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
