import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** Gedeelde decoratieve hero-laag voor de publieke site: een radiale gloed + een fijn
 * sparkle-stippelpatroon, beide afgeleid van de event-accentkleur (`--accent`, per event
 * instelbaar via Event.theme) — zo oogt elk event er "wervend" uit met zijn eigen
 * kleurenschema, zonder event-specifieke afbeeldingen. Gebruikt door zowel de altijd
 * aanwezige event-titel bovenaan (apps/web/app/[eventSlug]/page.tsx) als het optionele
 * admin-bewerkbare "hero"-PageBlock (packages/ui/src/page-block-view.tsx), zodat beide
 * exact dezelfde uitstraling delen. */
export function HeroFrame({ eyebrow, className, children }: { eyebrow?: string; className?: string; children: ReactNode }) {
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
      {/* text-primary i.p.v. text-accent: --accent is in dit ontwerpsysteem een vulkleur
          (bedoeld samen met --accent-foreground), geen op --background leesbare tekstkleur
          — --primary is dat wel, zie ook de cta-tekst hieronder in page-block-view.tsx. */}
      {eyebrow && <p className="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</p>}
      {children}
    </div>
  );
}
