import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNoticeByToken } from "@lions/core";
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
}: {
  params: Promise<{ eventSlug: string; token: string }>;
}) {
  const { eventSlug, token } = await params;
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
                <p>Wat wil je met dit bedrag doen?</p>
                <ChoiceForm token={token} amountLabel={amount} />
                <p className="text-xs text-muted-foreground">
                  Een terugbetaling gaat naar de rekening waarmee je hebt betaald en kan enkele werkdagen duren. Kies je
                  niet, dan storten we het bedrag na de deadline automatisch terug.
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
