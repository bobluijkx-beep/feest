import { prisma } from "@lions/core";
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { CreateUserForm } from "./create-user-form";
import { UserRowForm } from "./user-row-form";
import { toggleStaffActive } from "./actions";

export default async function UsersPage() {
  const actor = await requireStaffRole(["ADMIN"]);

  const [users, events] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: actor.organizationId },
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
      <CreateUserForm events={events} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mailadres</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <UserRowForm
                      userId={u.id}
                      initialRole={u.role}
                      initialEventIds={u.eventAccess.map((a) => a.eventId)}
                      events={events}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Actief" : "Inactief"}</Badge>
                  </TableCell>
                  <TableCell>
                    <form action={toggleStaffActive}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="isActive" value={String(u.isActive)} />
                      <Button type="submit" size="sm" variant={u.isActive ? "destructive" : "outline"}>
                        {u.isActive ? "Deactiveren" : "Activeren"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nog geen gebruikers.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
