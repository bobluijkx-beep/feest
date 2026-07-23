import { NextResponse } from "next/server";
import { processMolliePaymentWebhook } from "@lions/core";

// Mollie stuurt application/x-www-form-urlencoded met alleen een `id`-veld. De
// betaalstatus wordt binnen processMolliePaymentWebhook altijd opnieuw bij Mollie zelf
// opgehaald — deze route vertrouwt de body verder niet.
export async function POST(request: Request) {
  const formData = await request.formData();
  const paymentId = formData.get("id");

  if (typeof paymentId !== "string" || !paymentId) {
    return NextResponse.json({ error: "Ontbrekend payment-id" }, { status: 400 });
  }

  try {
    await processMolliePaymentWebhook(paymentId);
  } catch (err) {
    console.error("Mollie webhook verwerking mislukt", err);
    // 500 zodat Mollie het later opnieuw probeert — verwerking is idempotent.
    return NextResponse.json({ error: "Verwerking mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
