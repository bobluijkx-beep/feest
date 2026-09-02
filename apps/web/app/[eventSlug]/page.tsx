import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { PageBlocksList, HeroFrame, buttonVariants } from "@lions/ui";
import { getPublicEvent } from "@/lib/get-event";
import { ContactSuccessDialog } from "./contact-success-dialog";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventSlug } = await params;
  const { error } = await searchParams;

  const event = await getPublicEvent(eventSlug);
  if (!event) notFound();

  const pageBlocks = await prisma.pageBlock.findMany({
    where: { eventId: event.id, isPublished: true },
    orderBy: { order: "asc" },
  });

  const dateEyebrow = event.startsAt
    .toLocaleDateString("nl-NL", { day: "numeric", month: "long", timeZone: "Europe/Amsterdam" })
    .toUpperCase();

  const themeRaw = isRecord(event.theme) ? event.theme : {};
  const heroImageUrl = typeof themeRaw.heroImageUrl === "string" ? themeRaw.heroImageUrl : undefined;
  const logoUrl = typeof themeRaw.logoUrl === "string" && themeRaw.logoUrl ? themeRaw.logoUrl : undefined;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:max-w-4xl lg:max-w-6xl">
      <HeroFrame eyebrow={dateEyebrow} backgroundImageUrl={heroImageUrl} logoUrl={logoUrl}>
        <h1 className="font-display text-4xl">{event.name}</h1>
        {event.description && (
          <p className="mt-3 text-base font-semibold text-foreground sm:text-lg">{event.description}</p>
        )}
        <p className="mt-2 text-sm text-foreground/80">
          {event.startsAt.toLocaleDateString("nl-NL", { dateStyle: "full", timeZone: "Europe/Amsterdam" })}
          {event.venue ? ` — ${event.venue}` : ""}
        </p>
        <Link href={`/${eventSlug}/producten`} className={buttonVariants({ size: "lg", className: "mt-6" })}>
          Bekijk tickets &amp; producten
        </Link>
      </HeroFrame>

      {error === "stock" && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Helaas, er zijn niet meer genoeg artikelen beschikbaar. Pas je winkelwagen aan.
        </p>
      )}
      {error === "unknown" && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Er ging iets mis bij het starten van de betaling. Probeer het opnieuw.
        </p>
      )}

      <div className="mt-6">
        <PageBlocksList blocks={pageBlocks} />
      </div>

      {/* Bevestigingspop-up na het contactformulier (apps/web/app/(site)/contact) — dat
          stuurt door naar HOME_EVENT_SLUG (lib/site-config.ts), het event dat nu als
          "startpagina" van de site fungeert. useSearchParams (in de dialoog) heeft een
          Suspense-grens nodig, anders faalt het prerenderen van deze pagina. */}
      <Suspense fallback={null}>
        <ContactSuccessDialog />
      </Suspense>
    </main>
  );
}
