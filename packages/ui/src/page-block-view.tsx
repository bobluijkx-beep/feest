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

/** Rendert één blok. Onbekend/kapot `content` wordt overgeslagen (met een console.warn),
 * niet een crashende pagina — contentfouten van bestuursleden mogen de kassa nooit
 * platleggen. `availableTickets` is het enige stukje live data dat een blok nodig kan
 * hebben (type "availability") — expliciet meegegeven door de aanroeper (die wél DB-
 * toegang heeft) in plaats van dat dit component zelf gaat fetchen. */
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

  switch (type) {
    case "hero": {
      const title = str(content.title);
      if (!title) return null;
      const subtitle = str(content.subtitle);
      const imageUrl = str(content.imageUrl);
      const eyebrow = str(content.eyebrow);
      const ctaLabel = str(content.ctaLabel);
      const ctaHref = str(content.ctaHref);
      return (
        <section className="py-4">
          <HeroFrame eyebrow={eyebrow}>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="mx-auto mb-4 max-w-full rounded-xl" />
            )}
            <h2 className="font-display text-3xl">{title}</h2>
            {subtitle && <p className="mt-2 text-base font-semibold text-foreground sm:text-lg">{subtitle}</p>}
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
      const title = str(content.title);
      const body = str(content.body);
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
      const name = str(content.name);
      if (!name) return null;
      const logoUrl = str(content.logoUrl);
      const link = str(content.link);
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
      const question = str(content.question);
      const answer = str(content.answer);
      if (!question || !answer) return null;
      return (
        <div className="mb-4">
          <strong className="text-sm font-medium">{question}</strong>
          <p className="text-sm text-muted-foreground">{answer}</p>
        </div>
      );
    }

    case "availability": {
      const template = str(content.template);
      if (!template || availableTickets === undefined) return null;
      // {{aantal}} is bewust géén algemene {{placeholder}}-substitutie (zoals e-mails die
      // hebben, template-engine.ts) — dit blok kent maar één variabele, dus een simpele
      // split/join is genoeg en voorkomt escaping-gedoe met de rest van de HTML.
      const text = template.split("{{aantal}}").join(String(Math.max(availableTickets, 0)));
      return <p className="text-center text-sm font-semibold sm:text-base" dangerouslySetInnerHTML={{ __html: text }} />;
    }

    case "cta": {
      const label = str(content.label);
      const href = str(content.href);
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
