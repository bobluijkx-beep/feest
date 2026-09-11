import { prisma, verifySongRequestToken, getSongRequestsForOrder } from "@lions/core";
import { Button, Card, CardContent, Input, Label } from "@lions/ui";
import { submitSongRequestForm } from "./actions";

export default async function SongRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; fout?: string }>;
}) {
  const { token, fout } = await searchParams;
  const verified = token ? verifySongRequestToken(token) : null;

  const order = verified
    ? await prisma.order.findUnique({
        where: { id: verified.orderId },
        select: { id: true, buyerName: true, status: true, tickets: { select: { id: true } } },
      })
    : null;

  if (!order || order.status !== "PAID" || order.tickets.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col gap-2 text-center">
            <h1 className="text-xl font-semibold text-destructive">Ongeldige verzoeklink</h1>
            <p className="text-sm text-muted-foreground">
              Deze link is ongeldig, onvolledig of hoort niet bij een geslaagde bestelling met tickets.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const existing = await getSongRequestsForOrder(order.id);
  const voornaam = order.buyerName.split(" ")[0] ?? order.buyerName;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:max-w-4xl lg:max-w-6xl">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl">Hoi {voornaam}!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vraag hieronder tot 2 nummers aan die je graag op het feest wilt horen.
        </p>

        {fout === "onvolledig" && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Vul bij een nummer zowel de artiest als de titel in (of laat de hele regel leeg).
          </p>
        )}

        <form action={submitSongRequestForm} className="mt-6 flex flex-col gap-6">
          <input type="hidden" name="token" value={token} />

          <Card>
            <CardContent className="flex flex-col gap-4">
              {[1, 2].map((n) => {
                const row = existing[n - 1];
                return (
                  <div key={n} className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`artist${n}`}>Artiest</Label>
                      <Input id={`artist${n}`} name={`artist${n}`} type="text" defaultValue={row?.artist ?? ""} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`title${n}`}>Nummer</Label>
                      <Input id={`title${n}`} name={`title${n}`} type="text" defaultValue={row?.title ?? ""} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Button type="submit" size="lg">
            Plaatjes aanvragen
          </Button>
        </form>
      </div>
    </main>
  );
}
