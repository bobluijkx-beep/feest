import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { TicketTypeRowForm } from "./ticket-type-row-form";
import { CreateTicketTypeForm } from "./create-ticket-type-form";

export default async function TicketTypesPage() {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);

  const event = await prisma.event.findFirst({ where: { organizationId: actor.organizationId } });
  const ticketTypes = event
    ? await prisma.ticketType.findMany({ where: { eventId: event.id }, orderBy: { createdAt: "asc" } })
    : [];

  return (
    <main>
      <h1>Ticketsoorten</h1>
      {!event && <p>Nog geen event aangemaakt.</p>}

      {event && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem" }}>
            <tbody>
              {ticketTypes.map((ticketType) => (
                <TicketTypeRowForm key={ticketType.id} ticketType={ticketType} />
              ))}
              {ticketTypes.length === 0 && (
                <tr>
                  <td>Nog geen ticketsoorten.</td>
                </tr>
              )}
            </tbody>
          </table>

          <h2>Nieuwe ticketsoort</h2>
          <CreateTicketTypeForm />
        </>
      )}
    </main>
  );
}
