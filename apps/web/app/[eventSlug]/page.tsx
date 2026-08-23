import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { PageBlocksList, HeroFrame, buttonVariants } from "@lions/ui";
import { getPublicEvent } from "@/lib/get-event";

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

  const themeRaw = event.theme;
  const illustration =
    themeRaw && typeof themeRaw === "object" && !Array.isArray(themeRaw) && themeRaw.illustration === "disco"
      ? "disco"
      : undefined;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <HeroFrame eyebrow={dateEyebrow} illustration={illustration}>
        <h1 className="font-display text-4xl">{event.name}</h1>
        {event.description && <p className="mt-3 text-sm text-muted-foreground">{event.description}</p>}
        <p className="mt-2 text-sm text-muted-foreground">
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
    </main>
  );
}
