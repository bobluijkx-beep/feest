"use client";

import { useActionState } from "react";
import { Card, CardHeader, CardTitle, CardAction, CardContent, Badge, Button, Input, Label, Select } from "@lions/ui";
import { updateProduct, deleteProduct, type ProductActionState } from "./actions";

const initialState: ProductActionState = {};

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
  isActive: boolean;
  eventName: string;
}

export function ProductRowForm({ product }: { product: Product }) {
  const [updateState, updateAction, updatePending] = useActionState(updateProduct, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteProduct, initialState);
  const committed = product.reservedStock + product.soldStock;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardAction>
          <Badge variant="outline">{product.eventName}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form action={updateAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={product.id} />
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              className="size-14 rounded-md border border-input object-cover"
            />
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor={`kind-${product.id}`}>Soort</Label>
            <Select id={`kind-${product.id}`} name="kind" defaultValue={product.kind} className="w-36">
              <option value="TICKET">Ticket</option>
              <option value="MERCHANDISE">Product</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`name-${product.id}`}>Naam</Label>
            <Input id={`name-${product.id}`} type="text" name="name" defaultValue={product.name} required className="w-48" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`description-${product.id}`}>Omschrijving</Label>
            <Input
              id={`description-${product.id}`}
              type="text"
              name="description"
              defaultValue={product.description ?? ""}
              placeholder="Optioneel"
              className="w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`priceEuros-${product.id}`}>Prijs (€)</Label>
            <Input
              id={`priceEuros-${product.id}`}
              type="number"
              name="priceEuros"
              defaultValue={(product.priceCents / 100).toFixed(2)}
              step="0.01"
              min="0.01"
              required
              className="w-24"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`totalStock-${product.id}`}>Aantal</Label>
            <Input
              id={`totalStock-${product.id}`}
              type="number"
              name="totalStock"
              defaultValue={product.totalStock}
              min={committed}
              required
              className="w-20"
            />
          </div>
          <p className="pb-1.5 text-xs text-muted-foreground">({committed} gereserveerd/verkocht)</p>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`image-${product.id}`}>Foto vervangen</Label>
            <input id={`image-${product.id}`} type="file" name="image" accept="image/*" className="w-40 text-sm" />
          </div>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="size-4 rounded border-input" />
            Actief
          </label>
          <Button type="submit" disabled={updatePending}>
            {updatePending ? "Opslaan…" : "Opslaan"}
          </Button>
        </form>
        {updateState.error && <p className="text-sm text-destructive">{updateState.error}</p>}

        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!window.confirm(`Product "${product.name}" verwijderen?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={product.id} />
          <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
            {deletePending ? "Bezig…" : "Verwijderen"}
          </Button>
        </form>
        {deleteState.error && <p className="text-sm text-destructive">{deleteState.error}</p>}
      </CardContent>
    </Card>
  );
}
