"use client";

import { useActionState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label } from "@lions/ui";
import { ComponentPicker } from "./component-picker";
import { updateBundle, deleteBundle, type BundleActionState } from "./actions";

const initialState: BundleActionState = {};

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  isActive: boolean;
  eventName: string;
  items: { productId: string; quantity: number }[];
}

interface PickerProduct {
  id: string;
  name: string;
  kind: string;
}

export function BundleRowForm({ bundle, availableProducts }: { bundle: Bundle; availableProducts: PickerProduct[] }) {
  const [updateState, updateAction, updatePending] = useActionState(updateBundle, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteBundle, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {bundle.name} <span className="font-normal text-muted-foreground">— {bundle.eventName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form action={updateAction} className="flex flex-wrap items-start gap-3">
          <input type="hidden" name="id" value={bundle.id} />
          {bundle.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bundle.imageUrl} alt="" className="size-14 rounded-md border border-input object-cover" />
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor={`name-${bundle.id}`}>Naam</Label>
            <Input id={`name-${bundle.id}`} type="text" name="name" defaultValue={bundle.name} required className="w-48" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`description-${bundle.id}`}>Omschrijving</Label>
            <Input
              id={`description-${bundle.id}`}
              type="text"
              name="description"
              defaultValue={bundle.description ?? ""}
              placeholder="Optioneel"
              className="w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`priceEuros-${bundle.id}`}>Prijs (€)</Label>
            <Input
              id={`priceEuros-${bundle.id}`}
              type="number"
              name="priceEuros"
              defaultValue={(bundle.priceCents / 100).toFixed(2)}
              step="0.01"
              min="0.01"
              required
              className="w-24"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`image-${bundle.id}`}>Foto vervangen</Label>
            <input id={`image-${bundle.id}`} type="file" name="image" accept="image/*" className="w-40 text-sm" />
          </div>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={bundle.isActive} className="size-4 rounded border-input" />
            Actief
          </label>

          <ComponentPicker availableProducts={availableProducts} defaultComponents={bundle.items} />

          <Button type="submit" disabled={updatePending}>
            {updatePending ? "Opslaan…" : "Opslaan"}
          </Button>
        </form>
        {updateState.error && <p className="text-sm text-destructive">{updateState.error}</p>}

        {/* Zelfde regel als bij een gewoon product: alleen op inactief verwijderbaar. */}
        {!bundle.isActive && (
          <form
            action={deleteAction}
            onSubmit={(e) => {
              if (!window.confirm(`Combi "${bundle.name}" definitief verwijderen?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={bundle.id} />
            <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
              {deletePending ? "Bezig…" : "Verwijderen"}
            </Button>
          </form>
        )}
        {deleteState.error && <p className="text-sm text-destructive">{deleteState.error}</p>}
      </CardContent>
    </Card>
  );
}
