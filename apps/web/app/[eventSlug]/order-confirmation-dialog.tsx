"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@lions/ui";
import { useCart } from "./cart-context";

/** Zelfde titel/tekst als voorheen op de losse /bedankt-pagina (bedankt/page.tsx) — die
 * pagina bestaat nog steeds (Mollie's redirectUrl wijst er nog naartoe, en de
 * PENDING-status moet daar blijven pollen), maar stuurt bij een terminale status nu door
 * naar de eventpagina zelf met ?bestelling=<key>, waar deze pop-up 'm toont. */
const STATUS_COPY: Record<string, { title: string; description: string }> = {
  paid: { title: "Bedankt voor je bestelling!", description: "Je tickets zijn onderweg naar je e-mailadres." },
  paid_no_tickets: {
    title: "Bedankt voor je bestelling!",
    description: "Je ontvangt zo een bevestiging per e-mail.",
  },
  failed: { title: "Betaling mislukt", description: "Er ging iets mis met je betaling. Probeer het opnieuw." },
  cancelled: { title: "Betaling geannuleerd", description: "Je hebt de betaling geannuleerd." },
  expired: { title: "Betaling verlopen", description: "De betaaltermijn is verlopen. Probeer het opnieuw." },
  refunded: { title: "Bestelling terugbetaald", description: "Deze bestelling is terugbetaald." },
};

/** Toont de bestelbevestiging (elke uitkomst: betaald, mislukt, geannuleerd, …) als pop-up
 * op de eventpagina zelf, i.p.v. de vroegere losse /bedankt-pagina — zelfde patroon als
 * ContactSuccessDialog/UnsubscribeSuccessDialog. */
export function OrderConfirmationDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { clear, hydrated } = useCart();
  const [open, setOpen] = useState(false);

  const statusKey = searchParams.get("bestelling");
  const copy = statusKey ? STATUS_COPY[statusKey] : undefined;

  useEffect(() => {
    if (copy) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKey]);

  // Winkelwagen leegmaken zodra een bestelbevestiging in beeld komt (elke uitkomst, niet
  // alleen "paid" — ook na een mislukte/geannuleerde betaling hoort de oude inhoud niet
  // te blijven hangen). Wacht op `hydrated`, net als de vroegere ClearCartOnMount
  // (bedankt/clear-cart.tsx): deze pagina en CartProvider mounten tegelijk vanaf Mollie's
  // redirect, dus clear() vóór CartProvider's eigen hydratie-effect zou meteen weer
  // overschreven worden door de net-ingelezen (oude, volle) cart uit localStorage.
  useEffect(() => {
    if (copy && hydrated) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy, hydrated]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) router.replace(pathname);
  }

  if (!copy) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
