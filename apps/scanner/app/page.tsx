import { requireStaffRole } from "@/lib/require-role";
import { signOut } from "./actions/auth";
import { ScannerClient } from "./scanner-client";

export default async function ScannerHomePage() {
  const user = await requireStaffRole(["ADMIN", "DOOR_STAFF"]);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <span>{user.email}</span>
        <form action={signOut}>
          <button type="submit">Uitloggen</button>
        </form>
      </div>
      <ScannerClient />
    </main>
  );
}
