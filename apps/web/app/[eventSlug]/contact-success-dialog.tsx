"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@lions/ui";

/** Toont de bevestiging na het versturen van het contactformulier ((site)/contact/actions.ts
 * stuurt na een geslaagde verzending hierheen door met ?verzonden=1, naar HOME_EVENT_SLUG
 * — het event dat nu als "startpagina" van de site fungeert) als pop-up, i.p.v. een banner
 * op /contact zelf. Gebruikt op de event-landingspagina ([eventSlug]/page.tsx), dus
 * generiek voor welk event er ook als startpagina is ingesteld. */
export function ContactSuccessDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("verzonden") === "1") setOpen(true);
  }, [searchParams]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) router.replace(pathname);
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
