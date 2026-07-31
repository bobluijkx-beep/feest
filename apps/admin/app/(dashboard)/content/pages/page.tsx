import Link from "next/link";
import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

export default async function PageBlocksPage() {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const event = await prisma.event.findFirst({ where: { organizationId: actor.organizationId } });

  if (!event) {
    return (
      <main>
        <h1>Paginabeheer</h1>
        <p>Nog geen event aangemaakt.</p>
      </main>
    );
  }

  const blocks = await prisma.pageBlock.findMany({ where: { eventId: event.id }, orderBy: { order: "asc" } });

  return (
    <main>
      <h1>Paginabeheer</h1>
      <p>Event: {event.name}</p>
      <p>
        <Link href="/content/pages/new">+ Blok toevoegen</Link>
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Type</th>
            <th align="left">Volgorde</th>
            <th align="left">Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((b) => (
            <tr key={b.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{b.type}</td>
              <td>{b.order}</td>
              <td>{b.isPublished ? "Gepubliceerd" : "Concept"}</td>
              <td>
                <Link href={`/content/pages/${b.id}`}>Bewerken</Link>
              </td>
            </tr>
          ))}
          {blocks.length === 0 && (
            <tr>
              <td colSpan={4}>Nog geen blokken.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
