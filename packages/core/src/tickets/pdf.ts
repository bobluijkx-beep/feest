import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

const PAGE_WIDTH = 420;
const PAGE_HEIGHT = 640;
const DARK_BG = rgb(0.04, 0.04, 0.04);
const WHITE = rgb(1, 1, 1);
const MUTED_LIGHT = rgb(0.78, 0.79, 0.82);
const BODY_TEXT = rgb(0.1, 0.1, 0.1);
const ACCENT_LINE = rgb(0.78, 0.79, 0.82);

/** Haalt een afbeelding op en bedt 'm in — best-effort: een tijdelijk onbereikbare URL of
 * een onverwacht formaat (pdf-lib kent alleen png/jpg) mag het ticket zelf nooit laten
 * mislukken, dus geeft dit gewoon `null` terug in plaats van te gooien. */
async function embedImage(pdf: PDFDocument, url: string | undefined): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("png") || url.endsWith(".png")) return await pdf.embedPng(bytes);
    if (contentType.includes("jpeg") || contentType.includes("jpg") || /\.jpe?g$/.test(url)) {
      return await pdf.embedJpg(bytes);
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateTicketPdf(params: {
  eventName: string;
  venue: string | null;
  startsAt: Date;
  buyerName: string;
  ticketTypeName: string;
  qrToken: string;
  /** Overige artikelen (merchandise) uit dezelfde bestelling — puur informatief, geen
   * eigen QR/check-in. Zie docs/architectuurvoorstel.md ("merchandise & webshop"). */
  merchandiseLines?: string[];
  /** Event.theme.logoUrl/heroImageUrl (zie utils/event-theme.ts) — dezelfde clublogo/
   * sfeerfoto als op de publieke event-pagina, zodat het ticket er als bijlage net zo
   * herkenbaar "bij het feest" uitziet als de website. Beide optioneel: zonder theme
   * (bv. een event zonder ingestelde huisstijl) blijft de kop een effen donkere balk met
   * alleen de clubnaam. */
  logoUrl?: string;
  heroImageUrl?: string;
}): Promise<Uint8Array> {
  const qrPng = await QRCode.toBuffer(params.qrToken, { type: "png", margin: 1, width: 300 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const [hero, logo] = await Promise.all([embedImage(pdf, params.heroImageUrl), embedImage(pdf, params.logoUrl)]);

  const headerBottomY = drawHeader(page, boldFont, hero, logo);

  let y = headerBottomY - 40;
  const drawLine = (text: string, options: { size?: number; bold?: boolean } = {}) => {
    page.drawText(text, {
      x: 32,
      y,
      size: options.size ?? 12,
      font: options.bold ? boldFont : font,
      color: BODY_TEXT,
    });
    y -= (options.size ?? 12) + 10;
  };

  drawLine(params.eventName, { size: 18, bold: true });
  page.drawRectangle({ x: 32, y: y + 6, width: 48, height: 2, color: ACCENT_LINE });
  y -= 10;
  drawLine(params.ticketTypeName, { size: 14 });
  y -= 4;
  drawLine(`Naam: ${params.buyerName}`);
  drawLine(
    `Datum: ${params.startsAt.toLocaleDateString("nl-NL", { dateStyle: "full", timeZone: "Europe/Amsterdam" })} ${params.startsAt.toLocaleTimeString(
      "nl-NL",
      { timeStyle: "short", timeZone: "Europe/Amsterdam" },
    )}`,
  );
  if (params.venue) drawLine(`Locatie: ${params.venue}`);

  if (params.merchandiseLines && params.merchandiseLines.length > 0) {
    y -= 6;
    drawLine("Ook besteld:", { size: 11, bold: true });
    for (const line of params.merchandiseLines) {
      drawLine(line, { size: 11 });
    }
  }

  const qrImage = await pdf.embedPng(qrPng);
  page.drawImage(qrImage, { x: (PAGE_WIDTH - 220) / 2, y: y - 240, width: 220, height: 220 });

  return pdf.save();
}

/** Tekent de donkere merkkop (zelfde `#0a0a0a` als de e-mailenvelop, layout.ts) bovenaan
 * het ticket: optioneel de sfeerfoto van het event (contain-fit, niet uitgerekt — een
 * band met een andere beeldverhouding dan de foto krijgt dan wat "letterboxing" die door
 * de donkere achtergrond heen niet opvalt), en daaronder het clublogo + de clubnaam.
 * Geeft de y-coördinaat van de onderkant van de kop terug, zodat de rest van het ticket
 * daar meteen op kan aansluiten. */
function drawHeader(page: PDFPage, boldFont: PDFFont, hero: PDFImage | null, logo: PDFImage | null): number {
  const photoAreaHeight = hero ? 130 : 0;
  const brandStripHeight = 90;
  const bandHeight = photoAreaHeight + brandStripHeight;
  const bandTop = PAGE_HEIGHT;
  const bandBottom = PAGE_HEIGHT - bandHeight;

  page.drawRectangle({ x: 0, y: bandBottom, width: PAGE_WIDTH, height: bandHeight, color: DARK_BG });

  if (hero) {
    const inset = 14;
    const maxWidth = PAGE_WIDTH - inset * 2;
    const maxHeight = photoAreaHeight - inset;
    const scale = Math.min(maxWidth / hero.width, maxHeight / hero.height);
    const width = hero.width * scale;
    const height = hero.height * scale;
    page.drawImage(hero, {
      x: (PAGE_WIDTH - width) / 2,
      y: bandTop - inset - height,
      width,
      height,
    });
  }

  const stripCenterY = bandBottom + brandStripHeight / 2;
  const clubName = "LIONSCLUB VOORSCHOTEN";

  if (logo) {
    const logoHeight = 34;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    const nameSize = 9;
    const nameWidth = boldFont.widthOfTextAtSize(clubName, nameSize);
    page.drawImage(logo, {
      x: (PAGE_WIDTH - logoWidth) / 2,
      y: stripCenterY - logoHeight / 2 + 8,
      width: logoWidth,
      height: logoHeight,
    });
    page.drawText(clubName, {
      x: (PAGE_WIDTH - nameWidth) / 2,
      y: stripCenterY - logoHeight / 2 - 8,
      size: nameSize,
      font: boldFont,
      color: MUTED_LIGHT,
    });
  } else {
    const nameSize = 14;
    const nameWidth = boldFont.widthOfTextAtSize(clubName, nameSize);
    page.drawText(clubName, {
      x: (PAGE_WIDTH - nameWidth) / 2,
      y: stripCenterY - nameSize / 2,
      size: nameSize,
      font: boldFont,
      color: WHITE,
    });
  }

  return bandBottom;
}
