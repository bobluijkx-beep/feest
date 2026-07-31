import { prisma } from "@lions/core";
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
    <main>
      <h1>Gebruikers</h1>

      <CreateUserForm />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">E-mailadres</th>
            <th align="left">Rol</th>
            <th align="left">Status</th>
            <th align="left"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{u.email}</td>
              <td>
                <form action={updateStaffRole} style={{ display: "inline-flex", gap: "0.5rem" }}>
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="role" defaultValue={u.role}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="FINANCE">FINANCE</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="DOOR_STAFF">DOOR_STAFF</option>
                  </select>
                  <button type="submit">Opslaan</button>
                </form>
              </td>
              <td>{u.isActive ? "Actief" : "Inactief"}</td>
              <td>
                <form action={toggleStaffActive}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="isActive" value={String(u.isActive)} />
                  <button type="submit">{u.isActive ? "Deactiveren" : "Activeren"}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
