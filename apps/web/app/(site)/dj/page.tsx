import { prisma, verifyDjSetlistToken, getRankedSongRequests } from "@lions/core";
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@lions/ui";

/** Niet-gelinkte pagina (alleen bereikbaar via de getekende DjLink uit de admin,
 * apps/admin/app/(dashboard)/song-requests/dj-link.tsx) die de live songverzoek-ranglijst
 * toont voor de DJ — bewust zonder namen (alleen artiest/titel/aantal), dat is voor de DJ
 * niet relevant en zijn persoonsgegevens van kopers. Ververst zichzelf iedere 20 seconden,
 * zelfde <meta refresh>-mechanisme als /[eventSlug]/bedankt tijdens PENDING-polling — geen
 * client-JS nodig op een pagina die vaak op andermans/onbekende apparatuur open staat. */
export default async function DjSetlistPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const verified = token ? verifyDjSetlistToken(token) : null;

  if (!verified) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col gap-2 text-center">
            <h1 className="text-xl font-semibold text-destructive">Ongeldige link</h1>
            <p className="text-sm text-muted-foreground">Deze link is ongeldig of onvolledig.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const event = await prisma.event.findUnique({ where: { id: verified.eventId }, select: { name: true } });
  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col gap-2 text-center">
            <h1 className="text-xl font-semibold text-destructive">Event niet gevonden</h1>
          </CardContent>
        </Card>
      </main>
    );
  }

  const ranking = await getRankedSongRequests(verified.eventId, true);

  return (
    <>
      <meta httpEquiv="refresh" content="20" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl">Verzoeklijst — {event.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ververst automatisch elke 20 seconden.</p>

        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Artiest</TableHead>
              <TableHead>Nummer</TableHead>
              <TableHead className="text-right">Aantal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((row, index) => (
              <TableRow key={row.groupKey}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{row.artist}</TableCell>
                <TableCell>{row.title}</TableCell>
                <TableCell className="text-right tabular-nums">{row.count}</TableCell>
              </TableRow>
            ))}
            {ranking.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nog geen verzoeken.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </main>
    </>
  );
}
