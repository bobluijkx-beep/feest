"use client";

import { Button, Input } from "@lions/ui";

/** Aantalkiezer met expliciete +/- knoppen naast het getalveld. Een kaal
 * <input type="number"> toont op mobiel (iOS/Android) geen op/neer-pijltjes — die zijn
 * een desktop-only browserfunctie — waardoor het aantal daar alleen aan te passen leek
 * via het cijfertoetsenbord, wat niet duidelijk was. Deze knoppen werken overal hetzelfde
 * (tik/klik), het getalveld blijft ook gewoon rechtstreeks te bewerken. */
export function QuantityInput({
  value,
  onChange,
  min = 0,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  function clamp(v: number): number {
    const withMax = max !== undefined ? Math.min(max, v) : v;
    return Math.max(min, withMax);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="Aantal verlagen"
      >
        −
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        className="w-14 text-center"
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(clamp(value + 1))}
        disabled={max !== undefined && value >= max}
        aria-label="Aantal verhogen"
      >
        +
      </Button>
    </div>
  );
}
