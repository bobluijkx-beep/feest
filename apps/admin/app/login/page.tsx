import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@lions/ui";
import { signIn } from "../actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Lionsclub Voorschoten — Admin</CardTitle>
          <CardDescription>Log in met je bestuurs-account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="mt-2">
              Inloggen
            </Button>
          </form>
          <Link href="/wachtwoord-vergeten" className="mt-4 block text-sm text-primary hover:underline">
            Ik ben mijn wachtwoord vergeten
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
