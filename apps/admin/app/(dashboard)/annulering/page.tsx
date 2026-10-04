import Link from "next/link";
import { prisma, listNotices, countTestOrders, formatDeadline } from "@lions/core";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  buttonVariants,
} from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { getSelectedEvent } from "@/lib/selected-event";
import { EventTabs } from "@/lib/event-tabs";
import { ConfirmActionForm } from "./confirm-action-form";
import { TestBuyerForm } from "./test-buyer-form";
import {
  startCancellation,
  finalizeNonRespondersAction,
  retryFailedRefundsAction,
  removeTestBuyersAction,
  setCancellationDeadlineAction,
} from "./actions";

function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default async function CancellationPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const actor = await requireStaffRole(["ADMIN", "FINANCE"]);
  const { eventId } = await searchParams;
  const { events, selected: event } = await getSelectedEvent(actor, eventId);

  if (!event) return <p className="text-sm text-muted-foreground">Nog geen event aangemaakt.</p>;

  const tabs = <EventTabs events={events} selectedId={event.id} basePath="/annulering" />;

  const [testProducts, testOrderCount] = await Promise.all([
    prisma.product.findMany({
      where: { eventId: event.id, isActive: true, kind: { in: ["TICKET", "MERCHANDISE"] } },
      orderBy: { priceCents: "asc" },
      select: { id: true, name: true, priceCents: true },
    }),
    countTestOrders(event.id),
  ]);

  // Testkopers: orders met een gesimuleerd betaal-id — de hele workflow (keuzepagina, mails,
  // terugbetalen/doneren) loopt door zonder dat Mollie wordt geraakt.
  const testCard = (
    <Card>
      <CardHeader>
        <CardTitle>Testkopers (zonder Mollie)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">
          Voeg testkopers toe om de hele workflow te proberen: keuzemail, keuzepagina, terugbetalen, doneren en deels
          doneren, inclusief de bevestigingsmails (die komen echt aan op het opgegeven adres). Er wordt geen echte
          terugbetaling bij Mollie gedaan. Testkopers tellen tot het opruimen wél mee in het dashboard — verwijder ze
          daarna met de knop hieronder.
        </p>
        <TestBuyerForm eventId={event.id} products={testProducts} />
        {event.isCancelled && testOrderCount > 0 && (
          <div className="flex flex-col gap-1">
            <div>
              <Link
                href={`/mailings/new?eventId=${event.id}&segmentType=EVENT&cancellationFilter=TEST_ONLY`}
                className={buttonVariants({ size: "sm" })}
              >
                Keuzemail alleen naar testkopers sturen
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Opent het opstelscherm met uitsluitend de testkopers als ontvangers. Er wordt pas verstuurd na de
              bevestigingsvraag.
            </p>
          </div>
        )}
        {testOrderCount > 0 && (
          <ConfirmActionForm
            action={removeTestBuyersAction}
            eventId={event.id}
            label={`Alle testkopers verwijderen (${testOrderCount} ${testOrderCount === 1 ? "bestelling" : "bestellingen"})`}
            variant="outline"
            confirmMessage="Alle testkopers van dit evenement (bestellingen, tickets en keuzes) verwijderen? Echte bestellingen blijven ongemoeid."
          />
        )}
      </CardContent>
    </Card>
  );

  if (!event.isCancelled) {
    const paidBuyers = await prisma.order.groupBy({
      by: ["buyerEmail"],
      where: { eventId: event.id, isVisible: true, status: "PAID" },
    });
    return (
      <div className="flex flex-col gap-4">
        {tabs}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Evenement annuleren: {event.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <p>
              Hiermee wordt <strong>{event.name}</strong> als geannuleerd gemarkeerd: er kan niets meer besteld worden,
              bovenaan de site komt een rode melding, en voor elk van de <strong>{paidBuyers.length}</strong> kopers met
              een betaalde bestelling wordt een persoonlijke keuzelink aangemaakt (terugbetaling of doneren).
            </p>
            <p className="text-muted-foreground">
              Er wordt nog niets terugbetaald en niemand krijgt automatisch een mail — dat doe je daarna zelf via een
              mailing met <code>{"{{keuzelink}}"}</code> in het template.
            </p>
            <ConfirmActionForm
              action={startCancellation}
              eventId={event.id}
              label="Evenement annuleren"
              variant="destructive"
              confirmMessage={`${event.name} annuleren en keuzelinks aanmaken voor ${paidBuyers.length} kopers? Bestellen wordt direct geblokkeerd.`}
            />
          </CardContent>
        </Card>
        {testCard}
      </div>
    );
  }

  const [notices, optOuts] = await Promise.all([
    listNotices(event.id),
    prisma.emailOptOut.findMany({ select: { email: true } }),
  ]);
  const optedOut = new Set(optOuts.map((o) => o.email.toLowerCase()));

  // Per keuze het teruggestorte en het gedoneerde deel van amountCents: bij "Deels" (PARTIAL)
  // zit er in één keuze van beide wat in.
  const donatedPart = (n: (typeof notices)[number]) =>
    n.choice === "DONATE" ? n.amountCents : n.choice === "PARTIAL" ? (n.chosenDonationCents ?? 0) : 0;
  const refundedPart = (n: (typeof notices)[number]) => (n.choice === null ? 0 : n.amountCents - donatedPart(n));

  const refunded = notices.filter((n) => n.processedAt && refundedPart(n) > 0);
  const donated = notices.filter((n) => donatedPart(n) > 0);
  const pending = notices.filter((n) => n.choice === null);
  const failed = notices.filter((n) => n.choice !== null && !n.processedAt);
  const sum = (list: typeof notices) => list.reduce((total, n) => total + n.amountCents, 0);
  const sumBy = (list: typeof notices, part: (n: (typeof notices)[number]) => number) =>
    list.reduce((total, n) => total + part(n), 0);
  const pendingOptedOut = pending.filter((n) => optedOut.has(n.email.toLowerCase()));

  const mailingBase = `/mailings/new?eventId=${event.id}&segmentType=EVENT`;
  const totalDonated = notices.reduce((total, n) => total + n.donatedCents, 0);

  return (
    <div className="flex flex-col gap-4">
      {tabs}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Nog niet gekozen" value={String(pending.length)} sub={formatEuro(sum(pending))} />
        <Stat label="Terugbetaald" value={String(refunded.length)} sub={formatEuro(sumBy(refunded, refundedPart))} />
        <Stat label="Gedoneerd (keuze)" value={String(donated.length)} sub={formatEuro(sumBy(donated, donatedPart))} />
        <Stat label="Mislukt" value={String(failed.length)} sub={failed.length ? "opnieuw proberen" : "—"} />
      </div>
      <p className="text-xs text-muted-foreground">
        De bedragen hierboven gaan over tickets en producten. Reeds gedane donaties ({formatEuro(totalDonated)} van
        deze kopers) worden nooit terugbetaald en staan los van de keuze.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Deadline</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <form action={setCancellationDeadlineAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="eventId" value={event.id} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="deadline">Uiterlijk reageren op</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                defaultValue={event.cancellationDeadline?.toISOString().slice(0, 10) ?? ""}
                className="w-44"
              />
            </div>
            <Button type="submit" variant="outline">
              Opslaan
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            {event.cancellationDeadline
              ? `Ingesteld op ${formatDeadline(event.cancellationDeadline)}${
                  event.cancellationDeadline.getTime() < Date.now() ? " — verstreken" : ""
                }. `
              : "Nog geen deadline ingesteld. "}
            Wordt getoond op de keuzepagina en is als <code>{"{{deadline}}"}</code> te gebruiken in de keuzemail. Er
            gebeurt niets automatisch na deze datum: wie niet koos, betaal je zelf terug met de knop bij Acties.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`${mailingBase}&cancellationFilter=HAS_NOTICE`} className={buttonVariants({ size: "sm" })}>
              Keuzemail versturen
            </Link>
            <Link
              href={`${mailingBase}&cancellationFilter=NO_CHOICE_YET`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Herinnering aan wie nog niet koos
            </Link>
            <span className="text-xs text-muted-foreground">
              Zet <code>{"{{keuzelink}}"}</code> in het template (Link-knop, zoals bij {"{{ticketlink}}"}).
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ConfirmActionForm
              action={finalizeNonRespondersAction}
              eventId={event.id}
              label={`Niet-reageerders terugbetalen (${pending.length})`}
              variant="destructive"
              confirmMessage={`${pending.length} kopers die niet hebben gekozen nu volledig terugbetalen (${formatEuro(sum(pending))})? Dit kan niet ongedaan worden gemaakt.`}
            />
            {failed.length > 0 && (
              <ConfirmActionForm
                action={retryFailedRefundsAction}
                eventId={event.id}
                label={`Mislukte terugbetalingen opnieuw proberen (${failed.length})`}
                variant="outline"
                confirmMessage="De mislukte terugbetalingen opnieuw proberen?"
              />
            )}
          </div>

          {pendingOptedOut.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {pendingOptedOut.length} van de nog niet gekozen kopers heeft zich afgemeld voor mailings en ontvangt de
              keuzemail dus niet; zij worden bij &quot;Niet-reageerders terugbetalen&quot; gewoon terugbetaald.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Koper</TableHead>
                <TableHead>Tickets/producten</TableHead>
                <TableHead>Eerder gedoneerd</TableHead>
                <TableHead>Keuze</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <div className="font-medium">{n.buyerName}</div>
                    <div className="text-xs text-muted-foreground">{n.email}</div>
                  </TableCell>
                  <TableCell>{formatEuro(n.amountCents)}</TableCell>
                  <TableCell>{n.donatedCents > 0 ? formatEuro(n.donatedCents) : "—"}</TableCell>
                  <TableCell>
                    {n.choice === null
                      ? "—"
                      : n.choice === "REFUND"
                        ? "Terugbetalen"
                        : n.choice === "PARTIAL"
                          ? `Deels (${formatEuro(n.chosenDonationCents ?? 0)} doneren)`
                          : "Doneren"}
                    {n.isDefault && " (automatisch)"}
                  </TableCell>
                  <TableCell>
                    {n.choice === null ? (
                      <Badge variant="secondary">Wacht op keuze</Badge>
                    ) : n.processedAt ? (
                      <Badge>Afgerond</Badge>
                    ) : (
                      <Badge variant="destructive" title={n.lastError ?? undefined}>
                        Mislukt
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {notices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Geen kopers met een betaalde bestelling.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {testCard}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground">
      <p className="text-xs text-primary-foreground/80">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-primary-foreground/80">{sub}</p>
    </div>
  );
}
