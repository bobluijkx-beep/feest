"use client";

import { useState } from "react";
import { Button, Input } from "@lions/ui";
import { useCart, type CartItem } from "../../cart-context";

export function AddToCartButton({
  product,
  available,
}: {
  product: Omit<CartItem, "quantity">;
  available: number;
}) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="mt-4 flex items-center gap-3">
      <Input
        type="number"
        min={1}
        max={available}
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, Math.min(available, Number(e.target.value) || 1)))}
        className="w-20"
      />
      <Button
        onClick={() => {
          addItem(product, quantity);
          setAdded(true);
        }}
      >
        In winkelwagen
      </Button>
      {added && <span className="text-sm text-primary">Toegevoegd!</span>}
    </div>
  );
}
