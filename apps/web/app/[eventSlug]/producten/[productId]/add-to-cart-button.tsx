"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@lions/ui";
import { useCart, type CartItem } from "../../cart-context";
import { QuantityInput } from "../../quantity-input";

export function AddToCartButton({
  product,
  available,
  eventSlug,
}: {
  product: Omit<CartItem, "quantity">;
  available: number;
  eventSlug: string;
}) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <QuantityInput value={quantity} onChange={setQuantity} min={1} max={available} />
      <Button
        onClick={() => {
          addItem(product, quantity);
          setAdded(true);
        }}
      >
        In winkelwagen
      </Button>
      {added && (
        <>
          <span className="text-sm text-primary">Toegevoegd!</span>
          <Link href={`/${eventSlug}/winkelwagen`} className={buttonVariants()}>
            Naar de winkelwagen
          </Link>
        </>
      )}
    </div>
  );
}
