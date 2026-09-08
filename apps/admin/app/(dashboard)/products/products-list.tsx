"use client";

import { useBulkSelection } from "@/lib/use-bulk-selection";
import { BulkActionsBar } from "@/lib/bulk-actions-bar";
import { bulkSetProductsActive, bulkDeleteProducts } from "./actions";
import { ProductRowForm } from "./product-row-form";

interface Product {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  totalStock: number;
  reservedStock: number;
  soldStock: number;
  donationPresetsCents: number[];
  isActive: boolean;
  eventName: string;
}

/** Gedeeld door /products (mode="active") en /products/inactief (mode="inactive") — zelfde
 * kaartenlijst (ProductRowForm), alleen de bulkacties in de werkbalk verschillen. Zie
 * orders/orders-table.tsx voor hetzelfde patroon bij bestellingen. */
export function ProductsList({ products, mode }: { products: Product[]; mode: "active" | "inactive" }) {
  const { selected, toggle, toggleAll, allSelected, count, selectedIds, clear } = useBulkSelection(
    products.map((p) => p.id),
  );

  const actions =
    mode === "active"
      ? [
          {
            label: `Op inactief zetten (${count})`,
            pendingLabel: "Bezig…",
            variant: "destructive" as const,
            confirm:
              "Geselecteerde producten op inactief zetten? Ze verdwijnen dan uit dit overzicht (verplaatst naar de afdeling Inactief) en zijn niet meer te bestellen.",
            onRun: async () => {
              const result = await bulkSetProductsActive(selectedIds, false);
              if (!result.error) clear();
              return result;
            },
          },
        ]
      : [
          {
            label: `Weer actief maken (${count})`,
            pendingLabel: "Bezig…",
            onRun: async () => {
              const result = await bulkSetProductsActive(selectedIds, true);
              if (!result.error) clear();
              return result;
            },
          },
          {
            label: `Verwijderen (${count})`,
            pendingLabel: "Bezig…",
            variant: "destructive" as const,
            confirm: "Geselecteerde producten definitief verwijderen? Dit kan niet ongedaan worden gemaakt.",
            onRun: async () => {
              const result = await bulkDeleteProducts(selectedIds);
              if (!result.error) clear();
              return result;
            },
          },
        ];

  return (
    <div className="flex flex-col gap-4">
      <BulkActionsBar count={count} allSelected={allSelected} onToggleAll={toggleAll} actions={actions} />
      {products.map((product) => (
        <ProductRowForm
          key={product.id}
          product={product}
          selected={selected.has(product.id)}
          onToggleSelect={() => toggle(product.id)}
        />
      ))}
      {products.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {mode === "active" ? "Nog geen producten." : "Geen inactieve producten."}
        </p>
      )}
    </div>
  );
}
