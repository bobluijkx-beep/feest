import "server-only";
import type { EmailTemplateType } from "@lions/db";
import { prisma } from "../db";
import { sendEmail } from "./resend";
import { type RenderableTemplate } from "./template-engine";
import { renderWithLayout } from "./layout";
import { getEmailLayoutHtml } from "./get-layout";
import { defaultEmailTemplates } from "./default-templates";
import { generateTicketPdf } from "../tickets/pdf";
import { generateIcsInvite } from "../tickets/ics";

type OrderWithRelations = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  eventId: string;
  event: { organizationId: string; name: string; venue: string | null; startsAt: Date };
  tickets: { qrToken: string }[];
  items: { productId: string; quantity: number; product: { name: string; kind: string } }[];
};

function merchandiseLines(order: OrderWithRelations): string[] {
  return order.items
    .filter((item) => item.product.kind === "MERCHANDISE")
    .map((item) => `${item.quantity}x ${item.product.name}`);
}

/** Rendert een order-mail vólledig verzendklaar: de per-type inhoud (DB-rij of
 * fallback-default) mét placeholders, omlijst met de gekozen (of standaard-)
 * EmailLayout van de organisatie. */
async function renderOrderEmail(order: OrderWithRelations, type: EmailTemplateType): Promise<RenderableTemplate> {
  const templateRow = await prisma.emailTemplate.findUnique({
    where: { eventId_type_language: { eventId: order.eventId, type, language: "nl" } },
  });
  const template = templateRow ?? defaultEmailTemplates[type];

  const lines = merchandiseLines(order);
  const ticketsSection =
    order.tickets.length > 0
      ? "<p>Je tickets (met QR-code) vind je als bijlage bij deze e-mail. Neem ze mee op je telefoon of geprint naar het evenement.</p>"
      : "";
  const merchandiseSection = lines.length > 0 ? `<p>Ook besteld: ${lines.join(", ")}.</p>` : "";

  const layoutHtml = await getEmailLayoutHtml({
    organizationId: order.event.organizationId,
    layoutId: templateRow?.layoutId,
  });

  return renderWithLayout({
    layoutHtml,
    content: template,
    vars: {
      voornaam: order.buyerName.split(" ")[0] ?? order.buyerName,
      event_naam: order.event.name,
      aantal_tickets: String(order.tickets.length),
      ticketcode: order.tickets.map((t) => t.qrToken).join(", "),
      datum: order.event.startsAt.toLocaleDateString("nl-NL", { dateStyle: "long", timeZone: "Europe/Amsterdam" }),
      locatie: order.event.venue ?? "",
      tickets_sectie: ticketsSection,
      merchandise: merchandiseSection,
    },
  });
}

async function logEmailAttempt(
  organizationId: string,
  orderId: string,
  action: string,
  result: Awaited<ReturnType<typeof sendEmail>>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId,
      action: result.ok ? `${action}_sent` : `${action}_failed`,
      entityType: "order",
      entityId: orderId,
      metadata: result.ok ? { messageId: result.messageId } : { error: result.error },
    },
  });
}

/** Stuurt de orderbevestiging voor een betaalde order. Bevat ticket-PDF's (+ ICS-
 * agenda-item) alleen als de order ook echt kind=TICKET-regels bevat — een pure
 * merchandise-order (bv. een oliebollenverkoop) krijgt gewoon een orderbevestiging zonder
 * bijlagen. Merchandise-regels worden, als ze aanwezig zijn, altijd vermeld — zowel in de
 * mail als op elk ticket-PDF. Zelfstandig herbruikbaar vanuit de webhook-handler of een
 * queue. */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      event: true,
      tickets: { include: { order: false } },
      items: { include: { product: true } },
    },
  });

  const { subject, bodyHtml } = await renderOrderEmail(order, "ORDER_CONFIRMATION");
  const lines = merchandiseLines(order);

  const productNameById = new Map(order.items.map((item) => [item.productId, item.product.name]));

  const attachments: { filename: string; content: string }[] = [];

  if (order.tickets.length > 0) {
    const ticketAttachments = await Promise.all(
      order.tickets.map(async (ticket, index) => {
        const pdfBytes = await generateTicketPdf({
          eventName: order.event.name,
          venue: order.event.venue,
          startsAt: order.event.startsAt,
          buyerName: order.buyerName,
          ticketTypeName: productNameById.get(ticket.productId) ?? "Ticket",
          qrToken: ticket.qrToken,
          merchandiseLines: lines,
        });
        return {
          filename: `ticket-${index + 1}.pdf`,
          content: Buffer.from(pdfBytes).toString("base64"),
        };
      }),
    );
    attachments.push(...ticketAttachments);

    const icsContent = generateIcsInvite({
      eventName: order.event.name,
      venue: order.event.venue,
      startsAt: order.event.startsAt,
      endsAt: order.event.endsAt,
    });
    attachments.push({ filename: "evenement.ics", content: Buffer.from(icsContent).toString("base64") });
  }

  const result = await sendEmail({ to: order.buyerEmail, subject, html: bodyHtml, attachments });

  await logEmailAttempt(order.event.organizationId, order.id, "email_confirmation", result);
}

/** Stuurt een korte melding wanneer een order een terminale faalstatus bereikt
 * (FAILED/CANCELLED/EXPIRED) — geen bijlagen, er zijn nog geen tickets. */
export async function sendPaymentFailedEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { event: true, tickets: true, items: { include: { product: true } } },
  });

  const { subject, bodyHtml } = await renderOrderEmail(order, "PAYMENT_FAILED");
  const result = await sendEmail({ to: order.buyerEmail, subject, html: bodyHtml });

  await logEmailAttempt(order.event.organizationId, order.id, "email_payment_failed", result);
}

/** Stuurt de annuleringsmelding — een losse, handmatige actie in de admin (los van
 * "op inactief zetten", dat is puur een zichtbaarheids-toggle zonder mail of
 * status-/ticketwijziging). Bedoeld voor als een board member een koper apart wil laten
 * weten dat een bestelling is geannuleerd, bijvoorbeeld na een terugbetaling. Geen
 * bijlagen. */
export async function sendCancelledEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { event: true, tickets: true, items: { include: { product: true } } },
  });

  const { subject, bodyHtml } = await renderOrderEmail(order, "CANCELLED");
  const result = await sendEmail({ to: order.buyerEmail, subject, html: bodyHtml });

  await logEmailAttempt(order.event.organizationId, order.id, "email_cancelled", result);
}
