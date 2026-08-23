import Link from "next/link";
import { Card, CardContent, Badge } from "@lions/ui";

interface GridProduct {
  id: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  totalStock: number;
  reservedStock: number;
  soldStock: number;
}

export function ProductGrid({ products, eventSlug }: { products: GridProduct[]; eventSlug: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {products.map((product) => {
        const available = product.totalStock - product.reservedStock - product.soldStock;
        return (
          <Link key={product.id} href={`/${eventSlug}/producten/${product.id}`}>
            <Card className="h-full gap-0 overflow-hidden p-0">
              <div className="aspect-square w-full bg-muted">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    Geen foto
                  </div>
                )}
              </div>
              <CardContent className="flex flex-col gap-1 p-3">
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">€{(product.priceCents / 100).toFixed(2)}</p>
                {available <= 0 && (
                  <Badge variant="secondary" className="w-fit">
                    Uitverkocht
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
