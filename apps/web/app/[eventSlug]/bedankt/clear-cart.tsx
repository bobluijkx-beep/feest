"use client";

import { useEffect } from "react";
import { useCart } from "../cart-context";

/** Leegt de winkelwagen zodra deze pagina een terminale orderstatus toont (PAID/FAILED/…)
 * — via de cart-context (niet direct localStorage), zodat ook de in-memory state van de
 * header meteen klopt bij verdere navigatie binnen dezelfde sessie.
 *
 * Wacht bewust op `hydrated` i.p.v. meteen bij mount te legen: Mollie's redirect terug
 * naar deze pagina is een echte paginaherlaad, dus CartProvider mount tegelijk met deze
 * component. React voert effects van dieper geneste componenten (dit component) vóór die
 * van hun ouders (CartProvider) uit — een clear() op mount-zonder-voorwaarde zou dus vóór
 * CartProvider's eigen hydratie-effect lopen, dat daarna alsnog de net-uitgelezen (oude,
 * volle) cart uit localStorage terugzet en zo de leegmaak ongedaan maakt. Reageren op
 * `hydrated` zorgt dat clear() pas na die hydratie plaatsvindt. */
export function ClearCartOnMount() {
  const { clear, hydrated } = useCart();

  useEffect(() => {
    if (hydrated) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  return null;
}
