"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { priceTierGroup, type TierGroupConfig } from "@lions/core/pricing/tiers";

export interface CartItem {
  // Voor een combi (ProductBundle) is dit een synthetische, unieke sleutel (`bundle-<id>`,
  // zie producten/combi/[bundleId]/page.tsx) i.p.v. een echt Product.id — de winkelwagen zelf
  // hoeft het verschil niet te kennen, alleen `bundleId` hieronder markeert het als combi voor
  // de kassa (afrekenen/checkout-form.tsx, actions.ts's startCheckout).
  productId: string;
  bundleId?: string;
  /** Staffelgroep van het product (PriceTierGroup) — stuks van producten met dezelfde groep
   * tellen voor de staffelprijs samen. */
  tierGroupId?: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  kind: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  /** Vervangt (i.p.v. optelt bij) een bestaande regel voor dit productId — nodig voor de
   * donatiemodule (donation-module.tsx): addItem's merge-gedrag zou bij een tweede keuze
   * (bv. eerst €10, dan €25) alleen de quantity optellen en de oude priceCents laten
   * staan, wat voor een donatie het gekozen bedrag stilletjes fout zou laten staan. */
  setItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  totalCount: number;
  totalCents: number;
  /** Staffelkorting in centen (al verwerkt in totalCents) en per groep een uitleg voor de weergave. */
  discountCents: number;
  tierSummaries: { name: string; discountCents: number }[];
  /** Of de localStorage-cart al is ingelezen. Nodig voor bv. ClearCartOnMount
   * (bedankt/clear-cart.tsx): op een echte pagina-herlaad (Mollie's redirect terug naar
   * de site) mount deze provider tegelijk met de pagina die meteen wil legen — zonder
   * deze vlag zou clear() vóór de hydratie-effect kunnen lopen en meteen daarna weer
   * overschreven worden door de net-ingelezen (oude, volle) cart uit localStorage. */
  hydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Winkelwagen leeft puur client-side in localStorage (sleutel `cart:{eventSlug}`) — er is
 * bewust geen backend-tabel voor: `createOrder()` valideert voorraad/prijs sowieso opnieuw
 * tegen de actuele database-waarden op het moment van bestellen, dus een verouderde
 * weergave hier heeft geen prijs-/voorraadrisico, alleen een cosmetisch risico dat we
 * accepteren voor deze schaal. */
export function CartProvider({
  eventSlug,
  tierGroups = [],
  children,
}: {
  eventSlug: string;
  tierGroups?: TierGroupConfig[];
  children: ReactNode;
}) {
  const storageKey = `cart:${eventSlug}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      // Corrupte cart-data negeren, gewoon met een lege winkelwagen verdergaan.
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, hydrated, storageKey]);

  function addItem(item: Omit<CartItem, "quantity">, quantity: number) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { ...item, quantity }];
    });
  }

  function setItem(item: Omit<CartItem, "quantity">, quantity: number) {
    setItems((prev) => {
      const others = prev.filter((i) => i.productId !== item.productId);
      return quantity <= 0 ? others : [...others, { ...item, quantity }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function clear() {
    setItems([]);
  }

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // Zelfde staffelberekening als createOrder() (packages/core/src/pricing/tiers.ts); alleen voor
  // weergave — de server rekent bij het bestellen altijd zelf opnieuw met de echte prijzen.
  const { discountCents, tierSummaries } = useMemo(() => {
    const summaries: { name: string; discountCents: number }[] = [];
    for (const group of tierGroups) {
      const lines = items
        .filter((i) => i.tierGroupId === group.id && !i.bundleId)
        .map((i) => ({ key: i.productId, quantity: i.quantity, unitPriceCents: i.priceCents }));
      if (lines.length === 0) continue;
      const result = priceTierGroup(group, lines);
      const discount = result.undiscountedCents - result.totalCents;
      if (discount > 0) summaries.push({ name: group.name, discountCents: discount });
    }
    return { discountCents: summaries.reduce((sum, s) => sum + s.discountCents, 0), tierSummaries: summaries };
  }, [items, tierGroups]);

  const totalCents = items.reduce((sum, i) => sum + i.quantity * i.priceCents, 0) - discountCents;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        setItem,
        updateQuantity,
        removeItem,
        clear,
        totalCount,
        totalCents,
        discountCents,
        tierSummaries,
        hydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart moet binnen een CartProvider gebruikt worden.");
  return ctx;
}
