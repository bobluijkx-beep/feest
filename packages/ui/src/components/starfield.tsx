/** Decoratieve sterrenhemel voor het donkere thema: een vaste (position: fixed) laag
 * achter alle content, met losse "sterren" (kleine cirkels) die onafhankelijk van elkaar
 * in en uit lichten — i.p.v. één CSS-achtergrondlaag die als geheel op/neer knippert (dat
 * oogt mechanisch, geen sterrenhemel). Puur CSS-animatie, geen JS-interval/canvas nodig.
 *
 * Determinisme is bewust: de "willekeurige" posities/timing komen uit een simpele, vast
 * geseede pseudo-random generator (geen `Math.random()`) zodat server- en client-render
 * exact hetzelfde opleveren — anders zou React een hydration-mismatch geven omdat de
 * sterren bij elke render ergens anders zouden staan. */

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface StarSpec {
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  peakOpacity: number;
}

function buildStars(count: number, seed: number, sizeRange: [number, number]): StarSpec[] {
  const random = mulberry32(seed);
  const stars: StarSpec[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      left: random() * 100,
      top: random() * 100,
      size: sizeRange[0] + random() * (sizeRange[1] - sizeRange[0]),
      duration: 2.2 + random() * 3.2,
      delay: -(random() * 6), // negatieve delay: start meteen ergens halverwege de cyclus i.p.v. alle sterren gelijk op te laten lopen
      peakOpacity: 0.6 + random() * 0.4,
    });
  }
  return stars;
}

// Drie "lagen" (ver/klein t/m dichtbij/groot) met eigen zaad, zodat de verdeling niet
// overlapt en er wat diepte in de hemel zit.
const STAR_LAYERS = [
  buildStars(90, 1, [0.6, 1.3]),
  buildStars(45, 2, [1.3, 2.2]),
  buildStars(18, 3, [2, 3.2]),
];

export function Starfield() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <style>{`
        @keyframes lions-star-twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.75); }
          50% { opacity: var(--star-peak, 1); transform: scale(1.15); }
        }
      `}</style>
      {STAR_LAYERS.flat().map((star, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            borderRadius: "9999px",
            background: "white",
            boxShadow: star.size > 2 ? "0 0 4px 1px rgba(255,255,255,0.6)" : undefined,
            animation: `lions-star-twinkle ${star.duration}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
            // @ts-expect-error -- CSS custom property, niet in React's stijl-type
            "--star-peak": star.peakOpacity,
          }}
        />
      ))}
    </div>
  );
}
