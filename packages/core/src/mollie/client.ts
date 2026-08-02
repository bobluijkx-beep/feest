import "server-only";
import createMollieClient, { type MollieClient, type Payment, type Refund } from "@mollie/api-client";
import { getMollieApiKey } from "../settings/settings";

function centsToAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export async function getMollieClient(organizationId: string): Promise<MollieClient> {
  const apiKey = await getMollieApiKey(organizationId);
  return createMollieClient({ apiKey });
}

export async function createMolliePayment(params: {
  organizationId: string;
  orderId: string;
  totalCents: number;
  currency: string;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
}): Promise<Payment> {
  const mollie = await getMollieClient(params.organizationId);
  return mollie.payments.create({
    amount: { currency: params.currency, value: centsToAmount(params.totalCents) },
    description: params.description,
    redirectUrl: params.redirectUrl,
    webhookUrl: params.webhookUrl,
    metadata: { orderId: params.orderId },
  });
}

/** Haalt de betaalstatus altijd opnieuw op bij Mollie — de webhook-body zelf wordt nooit vertrouwd. */
export async function fetchMolliePayment(organizationId: string, paymentId: string): Promise<Payment> {
  const mollie = await getMollieClient(organizationId);
  return mollie.payments.get(paymentId);
}

export async function createMollieRefund(params: {
  organizationId: string;
  molliePaymentId: string;
  amountCents: number;
  currency: string;
  description?: string;
}): Promise<Refund> {
  const mollie = await getMollieClient(params.organizationId);
  return mollie.paymentRefunds.create({
    paymentId: params.molliePaymentId,
    amount: { currency: params.currency, value: centsToAmount(params.amountCents) },
    description: params.description,
  });
}
