import { Button, Card, CardContent, Input, Label, Textarea } from "@lions/ui";
import { submitContactForm } from "./actions";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ verzonden?: string; fout?: string }>;
}) {
  const { verzonden, fout } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-2xl">Contact</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vraag, opmerking of idee? Stuur ons een bericht, we reageren zo snel mogelijk.
            </p>
          </div>

          {verzonden && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
              Bedankt voor je bericht! We nemen zo snel mogelijk contact op.
            </p>
          )}
          {fout === "ontbrekend" && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Vul je naam, e-mailadres en bericht in.
            </p>
          )}
          {fout === "onbekend" && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Er ging iets mis bij het versturen. Probeer het later nog eens.
            </p>
          )}

          <form action={submitContactForm} className="flex flex-col gap-4">
            {/* Honeypot: verborgen voor mensen (ook voor screenreaders), maar staat wel in
                de DOM — de meeste eenvoudige spambots vullen elk formulierveld in. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="naam">Naam</Label>
              <Input id="naam" name="naam" type="text" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bericht">Bericht</Label>
              <Textarea id="bericht" name="bericht" required rows={5} />
            </div>
            <Button type="submit" size="lg">
              Versturen
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
