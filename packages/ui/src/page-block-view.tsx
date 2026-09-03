// Gedeeld door apps/admin (preview vóór publiceren) en apps/web (publieke eventpagina),
// zodat beide exact dezelfde weergave per blok-type gebruiken. Puur presentationeel, geen
// hooks/browser-API's — werkt zonder "use client" in beide Next.js-apps.

import { HeroFrame } from "./components/hero-frame";
import { buttonVariants } from "./components/button";

export interface PageBlockData {
  id: string;
  type: string;
  content: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Vervangt {{aantal}} door het live aantal beschikbare tickets, in élk tekstveld van élk
 * bloktype (niet alleen "availability") — zo kan een bestuurslid "Nog {{aantal}}
 * toegangskaarten!" net zo goed in een hero-subtitel of FAQ-antwoord zetten. Simpele
 * split/join per stringveld, geen volledige {{placeholder}}-engine nodig voor één token
 * (zelfde afweging als system-placeholder-overrides met zijn {{waarde}}). Zonder een
 * bekend aantal (availableTickets undefined) blijft de tekst ongewijzigd staan. */
function withAvailableTickets(content: Record<string, unknown>, availableTickets: number | undefined) {
  if (availableTickets === undefined) return content;
  const count = String(Math.max(availableTickets, 0));
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(content)) {
    resolved[key] = typeof value === "string" ? value.split("{{aantal}}").join(count) : value;
  }
  return resolved;
}

/** Rendert één blok. Onbekend/kapot `content` wordt overgeslagen (met een console.warn),
 * niet een crashende pagina — contentfouten van bestuursleden mogen de kassa nooit
 * platleggen. `availableTickets` is het enige stukje live data dat een blok nodig kan
 * hebben ({{aantal}}, zie withAvailableTickets) — expliciet meegegeven door de aanroeper
 * (die wél DB-toegang heeft) in plaats van dat dit component zelf gaat fetchen. */
export function PageBlockView({
  type,
  content,
  availableTickets,
}: {
  type: string;
  content: unknown;
  availableTickets?: number;
}) {
  if (!isRecord(content)) {
    console.warn(`PageBlock van type "${type}" heeft geen geldige content, wordt overgeslagen.`);
    return null;
  }
  const c = withAvailableTickets(content, availableTickets);

  switch (type) {
    case "hero": {
      const title = str(c.title);
      if (!title) return null;
      const subtitle = str(c.subtitle);
      const imageUrl = str(c.imageUrl);
      const eyebrow = str(c.eyebrow);
      const ctaLabel = str(c.ctaLabel);
      const ctaHref = str(c.ctaHref);
      return (
        <section className="py-4">
          <HeroFrame eyebrow={eyebrow}>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="mx-auto mb-4 max-w-full rounded-xl" />
            )}
            <h2 className="font-display text-3xl">{title}</h2>
            {subtitle && (
              // subtitle komt uit de HtmlEditor (mag vet/kop/link bevatten, zie
              // event-omschrijving voor dezelfde afweging) — een <div> i.p.v. <p> om
              // eventuele geneste kop-HTML geldig te houden.
              <div
                className="mt-2 text-base font-semibold text-foreground [&_a]:underline [&_a]:underline-offset-2 sm:text-lg"
                dangerouslySetInnerHTML={{ __html: subtitle }}
              />
            )}
            {ctaLabel && ctaHref && (
              <a href={ctaHref} className={buttonVariants({ size: "lg", className: "mt-4" })}>
                {ctaLabel}
              </a>
            )}
          </HeroFrame>
        </section>
      );
    }

    case "programme": {
      const title = str(c.title);
      const body = str(c.body);
      if (!title && !body) return null;
      return (
        <section className="py-4">
          {title && <h2 className="font-heading text-lg font-medium">{title}</h2>}
          {body?.split("\n").map((line, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              {line}
            </p>
          ))}
        </section>
      );
    }

    case "sponsor": {
      const name = str(c.name);
      if (!name) return null;
      const logoUrl = str(c.logoUrl);
      const link = str(c.link);
      const inner = (
        <>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} className="max-h-[60px]" />
          )}
          <span className="text-sm">{name}</span>
        </>
      );
      return (
        <div className="m-2 inline-flex items-center gap-2">
          {link ? (
            <a href={link} className="inline-flex items-center gap-2 hover:opacity-80">
              {inner}
            </a>
          ) : (
            inner
          )}
        </div>
      );
    }

    case "faq_item": {
      const question = str(c.question);
      const answer = str(c.answer);
      if (!question || !answer) return null;
      return (
        <div className="mb-4">
          <strong className="text-sm font-medium">{question}</strong>
          <p className="text-sm text-muted-foreground">{answer}</p>
        </div>
      );
    }

    case "availability": {
      const template = str(c.template);
      if (!template || availableTickets === undefined) return null;
      return <p className="text-center text-sm font-semibold sm:text-base" dangerouslySetInnerHTML={{ __html: template }} />;
    }

    case "cta": {
      const label = str(c.label);
      const href = str(c.href);
      if (!label || !href) return null;
      return (
        <p className="text-center">
          <a href={href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            {label}
          </a>
        </p>
      );
    }

    default:
      console.warn(`Onbekend PageBlock-type "${type}", wordt overgeslagen.`);
      return null;
  }
}

export function PageBlocksList({
  blocks,
  availableTickets,
}: {
  blocks: PageBlockData[];
  availableTickets?: number;
}) {
  return (
    <>
      {blocks.map((block) => (
        <PageBlockView key={block.id} type={block.type} content={block.content} availableTickets={availableTickets} />
      ))}
    </>
  );
}
