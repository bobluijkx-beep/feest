"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createOrder, InsufficientStockError, prisma, getWebBaseUrl } from "@lions/core";

export async function startCheckout(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const eventSlug = String(formData.get("eventSlug") ?? "");
  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerEmail = String(formData.get("buyerEmail") ?? "").trim();
  // Checkbox is standaard aangevinkt (opt-out i.p.v. opt-in): een aangevinkte box stuurt
  // "on" mee, een uitgevinkte helemaal niets.
  const marketingOptIn = formData.get("marketingOptIn") === "on";

  // Een combi-regel in de winkelwagen heeft als productId de synthetische sleutel
  // `bundle-<id>` (cart-context.tsx/producten/combi/[bundleId]/page.tsx) — hier weer
  // uitgesplitst naar het aparte bundleItems-argument van createOrder(), dat de combi
  // zelf (nogmaals, server-side) valideert en in losse productregels "uitpakt".
  const allQtyEntries = [...formData.entries()]
    .filter(([key]) => key.startsWith("qty_"))
    .map(([key, value]) => ({ id: key.slice("qty_".length), quantity: Number(value) }))
    .filter((entry) => entry.quantity > 0);

  const items = allQtyEntries
    .filter((entry) => !entry.id.startsWith("bundle-"))
    .map((entry) => {
      // amount_<id>: alleen aanwezig voor een donatieregel (checkout-form.tsx) — het door
      // de bezoeker gekozen bedrag. createOrder() valideert dit hoe dan ook opnieuw tegen
      // de minimumgrens voordat het ooit als prijs gebruikt wordt.
      const amountRaw = formData.get(`amount_${entry.id}`);
      const customAmountCents = amountRaw !== null ? Number(amountRaw) : undefined;
      return { productId: entry.id, quantity: entry.quantity, customAmountCents };
    });

  const bundleItems = allQtyEntries
    .filter((entry) => entry.id.startsWith("bundle-"))
    .map((entry) => ({ bundleId: entry.id.slice("bundle-".length), quantity: entry.quantity }));

  if (!eventId || !buyerName || !buyerEmail || (items.length === 0 && bundleItems.length === 0)) {
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

  const baseUrl = getWebBaseUrl();
  const mailingCampaignId = (await cookies()).get("feest_ref")?.value;
  let checkoutUrl: string | null = null;

  try {
    const result = await createOrder({
      eventId,
      buyerName,
      buyerEmail,
      items,
      bundleItems,
      redirectBaseUrl: baseUrl,
      webhookBaseUrl: baseUrl,
      mailingCampaignId,
    });
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    if (err instanceof InsufficientStockError) redirect(`/${eventSlug}/afrekenen?error=stock`);
    console.error("Checkout mislukt", err);
    redirect(`/${eventSlug}/afrekenen?error=unknown`);
  }

  redirect(checkoutUrl ?? `/${eventSlug}/afrekenen?error=unknown`);
}
