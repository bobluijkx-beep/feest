import { CartPageClient } from "./cart-page-client";

export default async function CartPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  return <CartPageClient eventSlug={eventSlug} />;
}
