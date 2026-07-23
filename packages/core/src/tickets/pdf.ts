import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export async function generateTicketPdf(params: {
  eventName: string;
  venue: string | null;
  startsAt: Date;
  buyerName: string;
  ticketTypeName: string;
  qrToken: string;
}): Promise<Uint8Array> {
  const qrPng = await QRCode.toBuffer(params.qrToken, { type: "png", margin: 1, width: 300 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 560]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 500;
  const drawLine = (text: string, options: { size?: number; bold?: boolean } = {}) => {
    page.drawText(text, {
      x: 32,
      y,
      size: options.size ?? 12,
      font: options.bold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= (options.size ?? 12) + 10;
  };

  drawLine(params.eventName, { size: 18, bold: true });
  drawLine(params.ticketTypeName, { size: 14 });
  y -= 4;
  drawLine(`Naam: ${params.buyerName}`);
  drawLine(
    `Datum: ${params.startsAt.toLocaleDateString("nl-NL", { dateStyle: "full" })} ${params.startsAt.toLocaleTimeString(
      "nl-NL",
      { timeStyle: "short" },
    )}`,
  );
  if (params.venue) drawLine(`Locatie: ${params.venue}`);

  const qrImage = await pdf.embedPng(qrPng);
  page.drawImage(qrImage, { x: (400 - 220) / 2, y: y - 240, width: 220, height: 220 });

  return pdf.save();
}
