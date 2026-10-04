"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@lions/ui";

/** Groot, gecentreerd resultaatscherm direct nadat de koper heeft gekozen (de actie stuurt door
 * met ?gekozen=1). Sluiten laat de samenvatting op de pagina zelf staan; bij een latere bezoek
 * aan dezelfde link verschijnt deze pop-up niet opnieuw. */
export function ResultDialog({ title, lines }: { title: string; lines: string[] }) {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl">
        <div className="flex flex-col items-center gap-8 p-4 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500 text-4xl font-bold text-white" aria-hidden>
            ✓
          </div>
          <DialogHeader className="items-center gap-3">
            <DialogTitle className="text-3xl leading-tight">{title}</DialogTitle>
            <DialogDescription className="flex flex-col gap-3 text-lg text-foreground">
              {lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="w-full sm:flex-col">
            <Button
              size="lg"
              className="w-full border-neutral-300 bg-white text-black hover:bg-neutral-100 hover:text-black dark:border-neutral-300 dark:bg-white dark:text-black dark:hover:bg-neutral-100 dark:hover:text-black"
              onClick={() => setOpen(false)}
            >
              Sluiten
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
