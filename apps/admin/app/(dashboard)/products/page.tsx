import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { ProductRowForm } from "./product-row-form";
import { CreateProductForm } from "./create-product-form";

export default async function ProductsPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const events = await prisma.event.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { startsAt: "desc" },
  });
  const eventNameById = new Map(events.map((event) => [event.id, event.name]));

  const products = await prisma.product.findMany({
    where: { eventId: { in: events.map((event) => event.id) } },
    orderBy: [{ eventId: "asc" }, { createdAt: "asc" }],
  });

  return (
    <main>
      <h1>Producten</h1>
      {events.length === 0 && <p>Nog geen event aangemaakt.</p>}

      {events.length > 0 && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem" }}>
            <tbody>
              {products.map((product) => (
                <ProductRowForm
                  key={product.id}
                  product={{ ...product, eventName: eventNameById.get(product.eventId) ?? "?" }}
                />
              ))}
              {products.length === 0 && (
                <tr>
                  <td>Nog geen producten.</td>
                </tr>
              )}
            </tbody>
          </table>

          <h2>Nieuw product</h2>
          <CreateProductForm events={events.map((event) => ({ id: event.id, name: event.name }))} />
        </>
      )}
    </main>
  );
}
