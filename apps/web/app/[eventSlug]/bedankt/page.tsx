import { notFound } from "next/navigation";
import { prisma } from "@lions/core";

const STATUS_COPY: Record<string, { title: string; message: string }> = {
  PENDING: {
    title: "Betaling wordt verwerkt…",
    message: "We hebben je betaling nog niet bevestigd gekregen. Ververs deze pagina zo dadelijk nog eens.",
  },
  PAID: {
    title: "Bedankt voor je bestelling!",
    message: "Je tickets zijn onderweg naar je e-mailadres.",
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

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) notFound();

  const copy = STATUS_COPY[order.status] ?? STATUS_COPY.PENDING;

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>{copy.title}</h1>
      <p>{copy.message}</p>
    </main>
  );
}
