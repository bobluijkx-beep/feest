import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

const PAGE_WIDTH = 420;
const MIN_PAGE_HEIGHT = 640;
const DARK_BG = rgb(0.04, 0.04, 0.04);
const WHITE = rgb(1, 1, 1);
const MUTED_LIGHT = rgb(0.78, 0.79, 0.82);
const BODY_TEXT = rgb(0.1, 0.1, 0.1);
const ACCENT_LINE = rgb(0.78, 0.79, 0.82);

const HEADER_INITIAL_GAP = 40;
const QR_SIZE = 220;
const QR_GAP_ABOVE = 20;
const QR_BOTTOM_MARGIN = 30;

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

type ContentOp =
  | { kind: "line"; text: string; size: number; bold?: boolean }
  | { kind: "accent" }
  | { kind: "gap"; amount: number };

/** Bouwt de tekstblok-inhoud tussen kop en QR-code op als een lijst instructies i.p.v.
 * die meteen te tekenen, zodat exact dezelfde lijst zowel de benodigde hoogte kan meten
 * (buildContentOps + measureContentHeight, vóór de pagina wordt aangemaakt) als getekend
 * kan worden (drawContentOps) — anders lopen een losse hoogteberekening en het echte
 * tekenen op termijn uit elkaar. */
function buildContentOps(params: {
  eventName: string;
  ticketTypeName: string;
  buyerName: string;
  startsAt: Date;
  venue: string | null;
  merchandiseLines?: string[];
}): ContentOp[] {
  const ops: ContentOp[] = [
    { kind: "line", text: params.eventName, size: 18, bold: true },
    { kind: "accent" },
    { kind: "gap", amount: 10 },
    { kind: "line", text: params.ticketTypeName, size: 14 },
    { kind: "gap", amount: 4 },
    { kind: "line", text: `Naam: ${params.buyerName}`, size: 12 },
    {
      kind: "line",
      text: `Datum: ${params.startsAt.toLocaleDateString("nl-NL", { dateStyle: "full", timeZone: "Europe/Amsterdam" })} ${params.startsAt.toLocaleTimeString(
        "nl-NL",
        { timeStyle: "short", timeZone: "Europe/Amsterdam" },
      )}`,
      size: 12,
    },
  ];
  if (params.venue) ops.push({ kind: "line", text: `Locatie: ${params.venue}`, size: 12 });
  if (params.merchandiseLines && params.merchandiseLines.length > 0) {
    ops.push({ kind: "gap", amount: 6 });
    // "eenmalig" is bewust expliciet: bij meerdere tickets in één bestelling staat deze
    // sectie alleen op dit (het eerste) ticket, juist om te voorkomen dat de
    // deurbemanning 'm per ticket nog eens meegeeft.
    ops.push({ kind: "line", text: "Ook besteld (eenmalig, bij dit ticket):", size: 11, bold: true });
    for (const line of params.merchandiseLines) ops.push({ kind: "line", text: line, size: 11 });
  }
  return ops;
}

function measureContentHeight(ops: ContentOp[]): number {
  return ops.reduce((sum, op) => {
    if (op.kind === "line") return sum + op.size + 10;
    if (op.kind === "gap") return sum + op.amount;
    return sum;
  }, 0);
}

function drawContentOps(page: PDFPage, ops: ContentOp[], font: PDFFont, boldFont: PDFFont, startY: number): number {
  let y = startY;
  for (const op of ops) {
    if (op.kind === "line") {
      page.drawText(op.text, { x: 32, y, size: op.size, font: op.bold ? boldFont : font, color: BODY_TEXT });
      y -= op.size + 10;
    } else if (op.kind === "accent") {
      page.drawRectangle({ x: 32, y: y + 6, width: 48, height: 2, color: ACCENT_LINE });
    } else {
      y -= op.amount;
    }
  }
  return y;
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
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const [hero, logo] = await Promise.all([embedImage(pdf, params.heroImageUrl), embedImage(pdf, params.logoUrl)]);

  const bandHeight = (hero ? 130 : 0) + 90;
  const contentOps = buildContentOps(params);
  const contentHeight = measureContentHeight(contentOps);
  // De paginahoogte was voorheen een vaste 640pt, ongeacht hoeveel tekst (locatie,
  // meebestelde feestartikelen) erboven kwam — bij genoeg regels (bv. een event met
  // sfeerfoto + locatie + meerdere meebestelde artikelen) werd de QR-code daardoor met een
  // negatieve y-positie getekend, dus deels buiten de pagina en dus onscanbaar afgesneden.
  // De hoogte wordt nu berekend uit de daadwerkelijke inhoud, met 640 als ondergrens zodat
  // een kort ticket er niet anders uitziet dan voorheen.
  const pageHeight = Math.max(
    MIN_PAGE_HEIGHT,
    bandHeight + HEADER_INITIAL_GAP + contentHeight + QR_GAP_ABOVE + QR_SIZE + QR_BOTTOM_MARGIN,
  );

  const page = pdf.addPage([PAGE_WIDTH, pageHeight]);
  const headerBottomY = drawHeader(page, pageHeight, boldFont, hero, logo);

  const y = drawContentOps(page, contentOps, font, boldFont, headerBottomY - HEADER_INITIAL_GAP);

  const qrImage = await pdf.embedPng(qrPng);
  page.drawImage(qrImage, {
    x: (PAGE_WIDTH - QR_SIZE) / 2,
    y: y - QR_GAP_ABOVE - QR_SIZE,
    width: QR_SIZE,
    height: QR_SIZE,
  });

  return pdf.save();
}

/** Tekent de donkere merkkop (zelfde `#0a0a0a` als de e-mailenvelop, layout.ts) bovenaan
 * het ticket: optioneel de sfeerfoto van het event (contain-fit, niet uitgerekt — een
 * band met een andere beeldverhouding dan de foto krijgt dan wat "letterboxing" die door
 * de donkere achtergrond heen niet opvalt), en daaronder het clublogo + de clubnaam.
 * Geeft de y-coördinaat van de onderkant van de kop terug, zodat de rest van het ticket
 * daar meteen op kan aansluiten. */
function drawHeader(page: PDFPage, pageHeight: number, boldFont: PDFFont, hero: PDFImage | null, logo: PDFImage | null): number {
  const photoAreaHeight = hero ? 130 : 0;
  const brandStripHeight = 90;
  const bandHeight = photoAreaHeight + brandStripHeight;
  const bandTop = pageHeight;
  const bandBottom = pageHeight - bandHeight;

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
