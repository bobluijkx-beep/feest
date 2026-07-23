import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma, getCurrentUser, requireRole, AuthError } from "@lions/core";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function OrdersPage() {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);

  try {
    requireRole(user, ["ADMIN"]);
  } catch (err) {
    if (err instanceof AuthError) redirect(`/login?error=${encodeURIComponent(err.message)}`);
    throw err;
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, tickets: true, event: true },
    take: 100,
  });

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Bestellingen</h1>
      <p>
        <Link href="/">← Terug</Link>
      </p>
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
