import { notFound } from "next/navigation";
import { prisma, processMolliePaymentWebhook } from "@lions/core";

const STATUS_COPY: Record<string, { title: string; message: string }> = {
  PENDING: {
    title: "Betaling wordt verwerkt…",
    message: "We wachten op bevestiging van je bank. Deze pagina wordt automatisch bijgewerkt.",
  },
  PAID: {
    title: "Bedankt voor je bestelling!",
    message: "Je tickets zijn onderweg naar je e-mailadres.",
  },
  PAID_NO_TICKETS: {
    title: "Bedankt voor je bestelling!",
    message: "Je ontvangt zo een bevestiging per e-mail.",
  },
  FAILED: { title: "Betaling mislukt", message: "Er ging iets mis met je betaling. Probeer het opnieuw." },
  CANCELLED: { title: "Betaling geannuleerd", message: "Je hebt de betaling geannuleerd." },
  EXPIRED: { title: "Betaling verlopen", message: "De betaaltermijn is verlopen. Probeer het opnieuw." },
  REFUNDED: { title: "Bestelling terugbetaald", message: "Deze bestelling is terugbetaald." },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  if (!orderId) notFound();

  let order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, molliePaymentId: true, _count: { select: { tickets: true } } },
  });
  if (!order) notFound();

  // Mollie's redirect komt soms binnen vóórdat de webhook is verwerkt. In plaats van de
  // koper te vragen zelf te verversen, verwerken we de betaling hier meteen zelf (zelfde
  // idempotente functie als de webhook-route) — meestal is de status dan al terminaal
  // tegen de tijd dat de pagina rendert.
  if (order.status === "PENDING" && order.molliePaymentId) {
    await processMolliePaymentWebhook(order.molliePaymentId);
    order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, molliePaymentId: true, _count: { select: { tickets: true } } },
    });
  }

  const status = order?.status ?? "PENDING";
  // Een product-only order (bv. oliebollen) heeft geen tickets — "je tickets zijn
  // onderweg" zou dan misleidend zijn.
  const copyKey = status === "PAID" && order?._count.tickets === 0 ? "PAID_NO_TICKETS" : status;
  const copy = STATUS_COPY[copyKey] ?? STATUS_COPY.PENDING;

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      {status === "PENDING" && <meta httpEquiv="refresh" content="3" />}
      <h1>{copy.title}</h1>
      <p>{copy.message}</p>
    </main>
  );
}
