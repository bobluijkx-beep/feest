import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNoticeByToken, formatDeadline } from "@lions/core";
import { Card, CardContent } from "@lions/ui";
import { getPublicEvent } from "@/lib/get-event";
import { ChoiceForm } from "./choice-form";

// Verborgen pagina: nergens vanaf de site gelinkt en uitgesloten van zoekmachines — alleen
// bereikbaar via de persoonlijke link in de annuleringsmailing.
export const metadata: Metadata = { robots: { index: false, follow: false } };

function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default async function CancellationChoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string; token: string }>;
  searchParams: Promise<{ fout?: string }>;
}) {
  const { eventSlug, token } = await params;
  const { fout } = await searchParams;
  const [event, notice] = await Promise.all([getPublicEvent(eventSlug), getNoticeByToken(token)]);
  if (!event || !notice || notice.event.id !== event.id) notFound();

  const amount = formatEuro(notice.amountCents);
  const donatedNote =
    notice.donatedCents > 0
      ? `Daarnaast heb je eerder ${formatEuro(notice.donatedCents)} gedoneerd; dat bedrag blijft bij het goede doel en valt buiten deze keuze. Hartelijk dank daarvoor!`
      : null;
  const voornaam = notice.buyerName.split(" ")[0] ?? notice.buyerName;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:max-w-4xl lg:max-w-6xl">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl">{event.name} gaat niet door</h1>

        <Card className="mt-4">
          <CardContent className="flex flex-col gap-3 text-sm">
            {notice.choice === null && (
              <>
                <p>
                  Beste {voornaam}, helaas zijn er te weinig kaarten verkocht en moeten we het feest annuleren. Je hebt
                  <strong> {amount}</strong> betaald voor tickets en producten.
                </p>
                {donatedNote && <p>{donatedNote}</p>}
                {fout === "bedrag" && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                    Het ingevulde bedrag klopt niet: kies een bedrag tussen €0,01 en {formatEuro(notice.amountCents - 1)}.
                  </p>
                )}
                <ChoiceForm token={token} amountCents={notice.amountCents} />
                <p className="text-xs text-muted-foreground">
                  Een terugbetaling gaat naar de rekening waarmee je hebt betaald en kan enkele werkdagen duren.
                  {notice.event.cancellationDeadline
                    ? ` Maak je keuze uiterlijk ${formatDeadline(notice.event.cancellationDeadline)}; kies je niet, dan storten we het bedrag daarna terug.`
                    : " Kies je niet, dan storten we het bedrag na de deadline terug."}
                </p>
              </>
            )}

            {notice.choice === "REFUND" && (
              <>
                <p>
                  {notice.processedAt
                    ? `Je terugbetaling van ${amount} is in gang gezet.`
                    : `We verwerken je terugbetaling van ${amount}.`}
                </p>
                <p>
                  Het bedrag wordt teruggestort op de rekening waarmee je hebt betaald; dat kan enkele werkdagen duren.
                  {notice.isDefault && " Omdat je niet hebt gekozen, hebben we het bedrag automatisch teruggestort."}
                  {!notice.processedAt && " Lukt het niet automatisch, dan nemen wij contact met je op."}
                </p>
                {donatedNote && <p>{donatedNote}</p>}
              </>
            )}

            {notice.choice === "PARTIAL" && (
              <>
                <p>
                  Bedankt voor je keuze! Je doneert {formatEuro(notice.chosenDonationCents ?? 0)} aan ons goede doel en
                  ontvangt {formatEuro(notice.amountCents - (notice.chosenDonationCents ?? 0))} terug.
                </p>
                <p>
                  {notice.processedAt
                    ? "De terugbetaling is in gang gezet en wordt op de rekening waarmee je hebt betaald teruggestort; dat kan enkele werkdagen duren."
                    : "We verwerken je terugbetaling. Lukt het niet automatisch, dan nemen wij contact met je op."}{" "}
                  Je tickets zijn vervallen.
                </p>
                {donatedNote && <p>{donatedNote}</p>}
              </>
            )}

            {notice.choice === "DONATE" && (
              <>
                <p>Hartelijk dank! Je hebt {amount} gedoneerd aan ons goede doel.</p>
                <p>Je tickets zijn vervallen en er wordt niets teruggestort. Je ontvangt een bevestiging per e-mail.</p>
                {donatedNote && <p>{donatedNote}</p>}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
