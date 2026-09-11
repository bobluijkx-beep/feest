"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@lions/ui";

/** Toont de bevestiging na het aanvragen van muzieknummers ((site)/verzoeken/actions.ts
 * stuurt na een geslaagde inzending hierheen door met ?verzoek=1, naar HOME_EVENT_SLUG —
 * zelfde "startpagina"-event als de contact- en afmeldbevestiging) als pop-up i.p.v. een
 * banner op /verzoeken zelf. Zelfde patroon als contact-success-dialog.tsx. */
export function SongRequestSuccessDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("verzoek") === "1") setOpen(true);
  }, [searchParams]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) router.replace(pathname);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bedankt voor je verzoek!</DialogTitle>
          <DialogDescription>We proberen er zoveel mogelijk rekening mee te houden op het feest.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
