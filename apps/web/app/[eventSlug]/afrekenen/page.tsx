import { notFound } from "next/navigation";
import { getPublicEvent } from "@/lib/get-event";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventSlug } = await params;
  const { error } = await searchParams;

  const event = await getPublicEvent(eventSlug);
  if (!event) notFound();

  return <CheckoutForm eventId={event.id} eventSlug={eventSlug} error={error} />;
}
