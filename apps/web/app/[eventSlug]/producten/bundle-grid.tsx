import Link from "next/link";
import { Card, CardContent, Badge } from "@lions/ui";
import type { StorefrontBundle } from "@lions/core";

export function BundleGrid({ bundles, eventSlug }: { bundles: StorefrontBundle[]; eventSlug: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {bundles.map((bundle) => (
        <Link key={bundle.id} href={`/${eventSlug}/producten/combi/${bundle.id}`}>
          <Card className="h-full gap-0 overflow-hidden p-0">
            <div className="aspect-square w-full bg-muted">
              {bundle.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bundle.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  Geen foto
                </div>
              )}
            </div>
            <CardContent className="flex flex-col gap-1 p-3">
              <p className="text-sm font-medium">{bundle.name}</p>
              <p className="text-xs text-muted-foreground">
                {bundle.components.map((c) => `${c.quantity}x ${c.productName}`).join(" + ")}
              </p>
              <p className="text-sm text-muted-foreground">€{(bundle.priceCents / 100).toFixed(2)}</p>
              {bundle.availableUnits <= 0 && (
                <Badge variant="secondary" className="w-fit">
                  Uitverkocht
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
