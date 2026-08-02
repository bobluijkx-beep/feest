import "server-only";
import type { EmailTemplateType } from "@lions/db";
import { prisma } from "../db";
import { sendEmail } from "./resend";
import { renderTemplate, type RenderableTemplate } from "./template-engine";
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
};

async function renderOrderEmail(order: OrderWithRelations, type: EmailTemplateType): Promise<RenderableTemplate> {
  const templateRow = await prisma.emailTemplate.findUnique({
    where: { eventId_type_language: { eventId: order.eventId, type, language: "nl" } },
  });
  const template = templateRow ?? defaultEmailTemplates[type];

  return renderTemplate(template, {
    voornaam: order.buyerName.split(" ")[0] ?? order.buyerName,
    event_naam: order.event.name,
    aantal_tickets: String(order.tickets.length),
    ticketcode: order.tickets.map((t) => t.qrToken).join(", "),
    datum: order.event.startsAt.toLocaleDateString("nl-NL", { dateStyle: "long", timeZone: "Europe/Amsterdam" }),
    locatie: order.event.venue ?? "",
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

/** Stuurt de orderbevestiging (tickets als PDF-bijlage + ICS-agenda-item) voor een
 * betaalde order. Zelfstandig herbruikbaar vanuit de webhook-handler of een queue. */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      event: true,
      tickets: { include: { order: false } },
      items: { include: { ticketType: true } },
    },
  });

  const { subject, bodyHtml } = await renderOrderEmail(order, "ORDER_CONFIRMATION");

  const ticketTypeNameById = new Map<string, string>();
  for (const item of order.items) {
    if (item.ticketTypeId && item.ticketType) ticketTypeNameById.set(item.ticketTypeId, item.ticketType.name);
  }

  const ticketAttachments = await Promise.all(
    order.tickets.map(async (ticket, index) => {
      const pdfBytes = await generateTicketPdf({
        eventName: order.event.name,
        venue: order.event.venue,
        startsAt: order.event.startsAt,
        buyerName: order.buyerName,
        ticketTypeName: ticketTypeNameById.get(ticket.ticketTypeId) ?? "Ticket",
        qrToken: ticket.qrToken,
      });
      return {
        filename: `ticket-${index + 1}.pdf`,
        content: Buffer.from(pdfBytes).toString("base64"),
      };
    }),
  );

  const icsContent = generateIcsInvite({
    eventName: order.event.name,
    venue: order.event.venue,
    startsAt: order.event.startsAt,
    endsAt: order.event.endsAt,
  });

  const result = await sendEmail({
    to: order.buyerEmail,
    subject,
    html: bodyHtml,
    attachments: [
      ...ticketAttachments,
      { filename: "evenement.ics", content: Buffer.from(icsContent).toString("base64") },
    ],
  });

  await logEmailAttempt(order.event.organizationId, order.id, "email_confirmation", result);
}

/** Stuurt een korte melding wanneer een order een terminale faalstatus bereikt
 * (FAILED/CANCELLED/EXPIRED) — geen bijlagen, er zijn nog geen tickets. */
export async function sendPaymentFailedEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { event: true, tickets: true },
  });

  const { subject, bodyHtml } = await renderOrderEmail(order, "PAYMENT_FAILED");
  const result = await sendEmail({ to: order.buyerEmail, subject, html: bodyHtml });

  await logEmailAttempt(order.event.organizationId, order.id, "email_payment_failed", result);
}
