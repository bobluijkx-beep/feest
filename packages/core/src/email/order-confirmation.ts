import "server-only";
import { prisma } from "../db";
import { sendEmail } from "./resend";
import { renderTemplate } from "./template-engine";
import { defaultOrderConfirmationTemplate } from "./default-templates";
import { generateTicketPdf } from "../tickets/pdf";
import { generateIcsInvite } from "../tickets/ics";

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

  const templateRow = await prisma.emailTemplate.findUnique({
    where: { eventId_type_language: { eventId: order.eventId, type: "ORDER_CONFIRMATION", language: "nl" } },
  });
  const template = templateRow ?? defaultOrderConfirmationTemplate;

  const ticketCount = order.tickets.length;
  const { subject, bodyHtml } = renderTemplate(template, {
    voornaam: order.buyerName.split(" ")[0] ?? order.buyerName,
    event_naam: order.event.name,
    aantal_tickets: String(ticketCount),
    ticketcode: order.tickets.map((t) => t.qrToken).join(", "),
    datum: order.event.startsAt.toLocaleDateString("nl-NL", { dateStyle: "long" }),
    locatie: order.event.venue ?? "",
  });

  const ticketTypeNameById = new Map(order.items.map((item) => [item.ticketTypeId, item.ticketType.name]));

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

  await prisma.auditLog.create({
    data: {
      organizationId: order.event.organizationId,
      action: result.ok ? "email_confirmation_sent" : "email_confirmation_failed",
      entityType: "order",
      entityId: order.id,
      metadata: result.ok ? { messageId: result.messageId } : { error: result.error },
    },
  });
}
