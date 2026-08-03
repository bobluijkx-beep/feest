import { prisma } from "@lions/core";
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Select, Button } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { CreateUserForm } from "./create-user-form";
import { updateStaffRole, toggleStaffActive } from "./actions";

export default async function UsersPage() {
  const actor = await requireStaffRole(["ADMIN"]);

  const users = await prisma.user.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <CreateUserForm />

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
                    <form action={updateStaffRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <Select name="role" defaultValue={u.role} className="w-36">
                        <option value="ADMIN">ADMIN</option>
                        <option value="FINANCE">FINANCE</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="DOOR_STAFF">DOOR_STAFF</option>
                      </Select>
                      <Button type="submit" size="sm" variant="outline">
                        Opslaan
                      </Button>
                    </form>
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
