import Link from "next/link";
import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { UsersTable } from "../users-table";

/** Afdeling "Inactief": gebruikers die gedeactiveerd zijn (los, of in bulk). Alleen
 * hiervandaan kan een gebruiker weer actief gemaakt worden, of definitief verwijderd
 * (incl. hun Supabase Auth-inlog) — zelfde patroon als bestellingen/producten. */
export default async function InactiveUsersPage() {
  const actor = await requireStaffRole(["ADMIN"]);

  const [users, events] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: actor.organizationId, isActive: false },
      orderBy: { createdAt: "asc" },
      include: { eventAccess: { select: { eventId: true } } },
    }),
    prisma.event.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { startsAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">Inactieve gebruikers</h1>
          <p className="text-sm text-muted-foreground">
            Kunnen niet inloggen. Definitief verwijderen (incl. hun inlog) kan alleen hier.
          </p>
        </div>
        <Link href="/users" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          ← Terug naar actieve gebruikers
        </Link>
      </div>
      <UsersTable users={users} events={events} mode="inactive" currentUserId={actor.id} />
    </div>
  );
}
