"use server";

import { redirect } from "next/navigation";
import { createOrder, InsufficientStockError, prisma } from "@lions/core";

export async function startCheckout(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const eventSlug = String(formData.get("eventSlug") ?? "");
  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerEmail = String(formData.get("buyerEmail") ?? "").trim();
  // Checkbox is standaard aangevinkt (opt-out i.p.v. opt-in): een aangevinkte box stuurt
  // "on" mee, een uitgevinkte helemaal niets.
  const marketingOptIn = formData.get("marketingOptIn") === "on";

  const items = [...formData.entries()]
    .filter(([key]) => key.startsWith("qty_"))
    .map(([key, value]) => {
      const productId = key.slice("qty_".length);
      // amount_<id>: alleen aanwezig voor een donatieregel (checkout-form.tsx) — het door
      // de bezoeker gekozen bedrag. createOrder() valideert dit hoe dan ook opnieuw tegen
      // de minimumgrens voordat het ooit als prijs gebruikt wordt.
      const amountRaw = formData.get(`amount_${productId}`);
      const customAmountCents = amountRaw !== null ? Number(amountRaw) : undefined;
      return { productId, quantity: Number(value), customAmountCents };
    })
    .filter((item) => item.quantity > 0);

  if (!eventId || !buyerName || !buyerEmail || items.length === 0) {
    redirect(`/${eventSlug}/afrekenen?error=stock`);
  }

  // Los van of de bestelling zelf lukt: de voorkeur die de koper nu aangeeft is meteen
  // leidend voor toekomstige mailings (EmailOptOut, dezelfde tabel als de afmeldlink in
  // e-mails gebruikt) — aan- en uitvinken werkt dus beide kanten op, niet alleen afmelden.
  if (marketingOptIn) {
    await prisma.emailOptOut.deleteMany({ where: { email: buyerEmail } });
  } else {
    await prisma.emailOptOut.upsert({ where: { email: buyerEmail }, create: { email: buyerEmail }, update: {} });
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
    if (err instanceof InsufficientStockError) redirect(`/${eventSlug}/afrekenen?error=stock`);
    console.error("Checkout mislukt", err);
    redirect(`/${eventSlug}/afrekenen?error=unknown`);
  }

  redirect(checkoutUrl ?? `/${eventSlug}/afrekenen?error=unknown`);
}
