import Link from "next/link";
import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { CreateUserForm } from "./create-user-form";
import { UsersTable } from "./users-table";

export default async function UsersPage() {
  const actor = await requireStaffRole(["ADMIN"]);

  const [users, events, inactiveCount] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: actor.organizationId, isActive: true },
      orderBy: { createdAt: "asc" },
      include: { eventAccess: { select: { eventId: true } } },
    }),
    prisma.event.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { startsAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.count({ where: { organizationId: actor.organizationId, isActive: false } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <CreateUserForm events={events} />

      <div className="flex items-center justify-end">
        <Link
          href="/users/inactief"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Inactieve gebruikers bekijken{inactiveCount > 0 ? ` (${inactiveCount})` : ""}
        </Link>
      </div>

      <UsersTable users={users} events={events} mode="active" currentUserId={actor.id} />
    </div>
  );
}
