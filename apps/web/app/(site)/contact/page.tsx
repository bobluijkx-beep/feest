import { Button, Card, CardContent, Input, Label, Textarea } from "@lions/ui";
import { submitContactForm } from "./actions";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string }>;
}) {
  const { fout } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:max-w-4xl lg:max-w-6xl">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl">Contact</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vraag, opmerking of idee? Stuur ons een bericht, we reageren zo snel mogelijk.
        </p>

        <form action={submitContactForm} className="mt-6 flex flex-col gap-6">
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

          <Card>
            <CardContent className="flex flex-col gap-4">
              <h2 className="font-heading text-base font-medium">Jouw bericht</h2>
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
            </CardContent>
          </Card>

          <Button type="submit" size="lg">
            Versturen
          </Button>
        </form>
      </div>
    </main>
  );
}
