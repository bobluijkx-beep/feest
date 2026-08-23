import { useId } from "react";
import { cn } from "../lib/cn";

/** Decoratieve discobal + sparkles, puur SVG (geen los beeldbestand) — vertaalt de sfeer
 * van het Black & White Party Night-affiche zonder de poster zelf te kopiëren. Opt-in per
 * event via Event.theme.illustration / hero-PageBlock content.illustration === "disco".
 * Gradient/clipPath-id's zijn per instance uniek (useId) — HeroFrame rendert dit component
 * twee keer, en dubbele SVG-id's op één pagina breken `url(#id)`-referenties. */
export function DiscoBallIllustration({ className }: { className?: string }) {
  const uid = useId();
  const gradId = `discoBallGrad-${uid}`;
  const clipId = `discoBallClip-${uid}`;

  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
    >
      <defs>
        <radialGradient id={gradId} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#d7dadf" />
          <stop offset="100%" stopColor="#84888f" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="100" cy="100" r="52" />
        </clipPath>
      </defs>

      <circle cx="100" cy="100" r="52" fill={`url(#${gradId})`} />

      <g clipPath={`url(#${clipId})`} stroke="#4b4f57" strokeWidth="1" opacity="0.5">
        <ellipse cx="100" cy="100" rx="52" ry="10" fill="none" />
        <ellipse cx="100" cy="100" rx="52" ry="24" fill="none" />
        <ellipse cx="100" cy="100" rx="52" ry="38" fill="none" />
        <ellipse cx="100" cy="100" rx="10" ry="52" fill="none" />
        <ellipse cx="100" cy="100" rx="24" ry="52" fill="none" />
        <ellipse cx="100" cy="100" rx="38" ry="52" fill="none" />
        <line x1="48" y1="100" x2="152" y2="100" />
        <line x1="100" y1="48" x2="100" y2="152" />
      </g>

      <g fill="#ffffff">
        <path
          d="M38 36 L42 48 L54 52 L42 56 L38 68 L34 56 L22 52 L34 48 Z"
          opacity="0.9"
        />
        <path
          d="M168 66 L170 73 L177 75 L170 77 L168 84 L166 77 L159 75 L166 73 Z"
          opacity="0.8"
        />
        <path
          d="M155 148 L158 157 L167 160 L158 163 L155 172 L152 163 L143 160 L152 157 Z"
          opacity="0.75"
        />
        <path
          d="M30 150 L32 156 L38 158 L32 160 L30 166 L28 160 L22 158 L28 156 Z"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}
