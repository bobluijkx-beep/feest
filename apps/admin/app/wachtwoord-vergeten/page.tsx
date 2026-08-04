import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@lions/ui";
import { requestPasswordReset } from "../actions/auth";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Wachtwoord vergeten</CardTitle>
          <CardDescription>Vul je e-mailadres in, dan sturen we een resetlink.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sent ? (
            <p className="text-sm text-muted-foreground">
              Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een e-mail met een link om een
              nieuw wachtwoord in te stellen.
            </p>
          ) : (
            <form action={requestPasswordReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mailadres</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <Button type="submit" className="mt-2">
                Resetlink versturen
              </Button>
            </form>
          )}
          <Link href="/login" className="text-sm text-primary hover:underline">
            Terug naar inloggen
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
