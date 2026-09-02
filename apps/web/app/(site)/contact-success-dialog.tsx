"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@lions/ui";

/** Toont de bevestiging na het versturen van het contactformulier (contact/actions.ts
 * stuurt na een geslaagde verzending hierheen door met ?verzonden=1) als pop-up op de
 * startpagina, i.p.v. een banner op /contact zelf — zo landt de bezoeker weer op de
 * "voorpagina" van de site, met de bevestiging er losstaand overheen. */
export function ContactSuccessDialog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("verzonden") === "1") setOpen(true);
  }, [searchParams]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) router.replace("/");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bedankt voor jouw bericht!</DialogTitle>
          <DialogDescription>We nemen zo snel mogelijk contact met je op.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
