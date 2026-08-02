import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { ProductRowForm } from "./product-row-form";
import { CreateProductForm } from "./create-product-form";

export default async function ProductsPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const event = await prisma.event.findFirst({ where: { organizationId: actor.organizationId } });
  const products = event
    ? await prisma.product.findMany({ where: { eventId: event.id }, orderBy: { createdAt: "asc" } })
    : [];

  return (
    <main>
      <h1>Producten (merchandise)</h1>
      {!event && <p>Nog geen event aangemaakt.</p>}

      {event && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem" }}>
            <tbody>
              {products.map((product) => (
                <ProductRowForm key={product.id} product={product} />
              ))}
              {products.length === 0 && (
                <tr>
                  <td>Nog geen producten.</td>
                </tr>
              )}
            </tbody>
          </table>

          <h2>Nieuw product</h2>
          <CreateProductForm />
        </>
      )}
    </main>
  );
}
