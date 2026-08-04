import Link from "next/link";
import { getCurrentUser } from "@lions/core";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@lions/ui";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { setNewPassword } from "../actions/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Nieuw wachtwoord instellen</CardTitle>
          <CardDescription>Kies een nieuw wachtwoord voor je account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {user ? (
            <form action={setNewPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Nieuw wachtwoord</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="mt-2">
                Wachtwoord instellen
              </Button>
            </form>
          ) : (
            <>
              <p className="text-sm text-destructive">
                Deze resetlink is ongeldig of verlopen. Vraag hieronder een nieuwe aan.
              </p>
              <Link href="/wachtwoord-vergeten" className="text-sm text-primary hover:underline">
                Nieuwe resetlink aanvragen
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
