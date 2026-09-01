import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** Gedeelde decoratieve hero-laag voor de publieke site: een radiale gloed + een fijn
 * sparkle-stippelpatroon, beide afgeleid van de event-accentkleur (`--accent`, per event
 * instelbaar via Event.theme) — zo oogt elk event er "wervend" uit met zijn eigen
 * kleurenschema, zonder event-specifieke afbeeldingen. Optioneel een echte
 * achtergrondfoto/-illustratie (`backgroundImageUrl`, bv. een uitsnede uit het eigen
 * evenementaffiche) die uitdooft naar de randen (CSS mask-image) zodat 'm naadloos in de
 * paginakleur overloopt, met een donkere overlay eronder voor leesbare tekst erbovenop.
 * Optioneel ook een `logoUrl` (bv. het clublogo), gecentreerd onderaan de hero — bewust
 * los van het admin-bewerkbare PageBlock-systeem, zie apps/web/app/[eventSlug]/page.tsx.
 * Gebruikt door zowel de altijd aanwezige event-titel bovenaan
 * (apps/web/app/[eventSlug]/page.tsx) als het admin-bewerkbare "hero"-PageBlock
 * (packages/ui/src/page-block-view.tsx). */
export function HeroFrame({
  eyebrow,
  backgroundImageUrl,
  logoUrl,
  className,
  children,
}: {
  eyebrow?: string;
  backgroundImageUrl?: string;
  logoUrl?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl px-6 py-12 text-center", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--accent) 45%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklch, var(--accent) 80%, white) 1px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* z-0 i.p.v. -z-10: een <img> is een "replaced element" en werd in tests niet
          geschilderd met een negatieve z-index in combinatie met overflow-hidden op deze
          wrapper (zelfde eigenaardigheid als eerder bij een losse SVG-illustratie hier) —
          gewone kleurlagen (div's hierboven) hadden dat probleem niet. */}
      {backgroundImageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundImageUrl}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 size-full object-cover opacity-80"
            style={{
              maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-background/55" />
        </>
      )}
      {/* relative z-0: zonder positionering vallen deze in-flow elementen in een eerdere
          CSS-schilderfase dan de hierboven positioneerde (z-0) achtergrondfoto, en zouden
          ze er dus ONDER komen te liggen i.p.v. erboven — expliciet positioneren op
          hetzelfde stackniveau lost dat op (DOM-volgorde bepaalt dan, en deze staat na de
          afbeelding). */}
      <div className="relative z-0">
        {/* text-primary i.p.v. text-accent: --accent is in dit ontwerpsysteem een vulkleur
            (bedoeld samen met --accent-foreground), geen op --background leesbare
            tekstkleur — --primary is dat wel, zie ook de cta-tekst hieronder in
            page-block-view.tsx. */}
        {eyebrow && <p className="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</p>}
        {children}
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mx-auto mt-8 h-[92px] w-auto opacity-90" />
        )}
      </div>
    </div>
  );
}
