"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  kind: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  totalCount: number;
  totalCents: number;
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
export function CartProvider({ eventSlug, children }: { eventSlug: string; children: ReactNode }) {
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
  const totalCents = items.reduce((sum, i) => sum + i.quantity * i.priceCents, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clear, totalCount, totalCents, hydrated }}
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
