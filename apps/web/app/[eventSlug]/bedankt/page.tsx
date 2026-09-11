import { notFound, redirect } from "next/navigation";
import { prisma, processMolliePaymentWebhook } from "@lions/core";
import { Card, CardContent } from "@lions/ui";

const PENDING_COPY = {
  title: "Betaling wordt verwerkt…",
  message: "We wachten op bevestiging van je bank. Deze pagina wordt automatisch bijgewerkt.",
};

// Sleutels van STATUS_COPY in ../order-confirmation-dialog.tsx — bij een terminale status
// (alles behalve PENDING) sturen we hierheen door i.p.v. deze Card te tonen, zodat de
// bevestiging als pop-up op de eventpagina zelf verschijnt (zelfde patroon als het
// contactformulier en een afmelding).
const TERMINAL_STATUS_KEY: Record<string, string> = {
  PAID: "paid",
  FAILED: "failed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  REFUNDED: "refunded",
};

export default async function ThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { eventSlug } = await params;
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

  if (status !== "PENDING") {
    // Een product-only order (bv. oliebollen) heeft geen tickets — "je tickets zijn
    // onderweg" zou dan misleidend zijn, vandaar de aparte "paid_no_tickets"-sleutel.
    const statusKey =
      status === "PAID" && order?._count.tickets === 0 ? "paid_no_tickets" : (TERMINAL_STATUS_KEY[status] ?? "paid");
    redirect(`/${eventSlug}?bestelling=${statusKey}`);
  }

  return (
    <main className="flex items-center justify-center px-4 py-12">
      <meta httpEquiv="refresh" content="3" />
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-2 text-center">
          <h1 className="text-xl font-semibold text-primary">{PENDING_COPY.title}</h1>
          <p className="text-sm text-muted-foreground">{PENDING_COPY.message}</p>
        </CardContent>
      </Card>
    </main>
  );
}
