"use server";

import { redirect } from "next/navigation";
import { createOrder, InsufficientStockError } from "@lions/core";

export async function startCheckout(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const eventSlug = String(formData.get("eventSlug") ?? "");
  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerEmail = String(formData.get("buyerEmail") ?? "").trim();

  const items = [...formData.entries()]
    .filter(([key]) => key.startsWith("qty_"))
    .map(([key, value]) =>
      key.startsWith("qty_product_")
        ? { productId: key.slice("qty_product_".length), quantity: Number(value) }
        : { ticketTypeId: key.slice("qty_".length), quantity: Number(value) },
    )
    .filter((item) => item.quantity > 0);

  if (!eventId || !buyerName || !buyerEmail || items.length === 0) {
    redirect(`/${eventSlug}?error=stock`);
  }

  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
  let checkoutUrl: string | null = null;

  try {
    const result = await createOrder({
      eventId,
      buyerName,
      buyerEmail,
      items,
      redirectBaseUrl: baseUrl,
      webhookBaseUrl: baseUrl,
    });
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    if (err instanceof InsufficientStockError) redirect(`/${eventSlug}?error=stock`);
    console.error("Checkout mislukt", err);
    redirect(`/${eventSlug}?error=unknown`);
  }

  redirect(checkoutUrl ?? `/${eventSlug}?error=unknown`);
}
