"use client";

import { useEffect } from "react";
import { useCart } from "../cart-context";

/** Leegt de winkelwagen zodra deze pagina een terminale orderstatus toont (PAID/FAILED/…)
 * — via de cart-context (niet direct localStorage), zodat ook de in-memory state van de
 * header meteen klopt bij verdere navigatie binnen dezelfde sessie. */
export function ClearCartOnMount() {
  const { clear } = useCart();

  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
