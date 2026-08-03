import { Button } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { signOut } from "./actions/auth";
import { ScannerClient } from "./scanner-client";

export default async function ScannerHomePage() {
  const user = await requireStaffRole(["ADMIN", "DOOR_STAFF"]);

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{user.email}</span>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Uitloggen
          </Button>
        </form>
      </div>
      <ScannerClient />
    </main>
  );
}
