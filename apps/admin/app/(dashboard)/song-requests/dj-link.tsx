"use client";

import { useState } from "react";
import { Button, Input } from "@lions/ui";

/** Toont de niet-gelinkte DJ-link (buildDjSetlistUrl, packages/core/src/song-requests/
 * token.ts) met een kopieerknop — te sturen naar de DJ zodat die 'm op een laptop/telefoon
 * kan openen. Geen navigatie in de admin zelf naar deze link, expliciet "verborgen". */
export function DjLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-sm font-medium">Link voor de DJ</p>
      <p className="text-sm text-muted-foreground">
        Deze link staat nergens op de site zelf — stuur &apos;m rechtstreeks naar de DJ. De pagina toont de actuele
        ranglijst (zonder namen) en ververst zichzelf.
      </p>
      <div className="flex gap-2">
        <Input readOnly value={url} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? "Gekopieerd!" : "Kopieer"}
        </Button>
      </div>
    </div>
  );
}
