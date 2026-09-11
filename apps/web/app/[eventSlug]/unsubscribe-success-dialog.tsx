"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@lions/ui";

/** Toont de bevestiging na het afmelden voor mailings ((site)/afmelden/page.tsx stuurt na
 * een geslaagde afmelding hierheen door met ?afgemeld=1, naar HOME_EVENT_SLUG — zelfde
 * "startpagina"-event als de contactbevestiging) als pop-up i.p.v. een aparte pagina.
 * Zelfde patroon als contact-success-dialog.tsx: DialogContent heeft standaard al een
 * sluitkruisje, en de dialoog zelf kan ook via de achtergrond of Escape dicht. */
export function UnsubscribeSuccessDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("afgemeld") === "1") setOpen(true);
  }, [searchParams]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) router.replace(pathname);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Je bent afgemeld</DialogTitle>
          <DialogDescription>
            Je ontvangt geen mailings meer van Lionsclub Voorschoten. Transactionele e-mails over een bestelling die
            je al geplaatst hebt (bv. orderbevestigingen) blijven wel gewoon aankomen.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
