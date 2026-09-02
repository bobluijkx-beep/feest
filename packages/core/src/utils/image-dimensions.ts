import "server-only";

export interface ImageDimensions {
  width: number;
  height: number;
}

function readPngDimensions(buf: Buffer): ImageDimensions | null {
  // PNG-signature (8 bytes) direct gevolgd door de IHDR-chunk (lengte + type "IHDR" +
  // data) — width/height staan altijd op vaste offsets 16/20, big-endian.
  if (buf.length < 24 || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpegDimensions(buf: Buffer): ImageDimensions | null {
  let offset = 2; // SOI (FFD8) overslaan
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    // Standalone markers zonder segmentlengte.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9) break; // EOI
    if (offset + 4 > buf.length) break;
    const segLength = buf.readUInt16BE(offset + 2);
    // SOFn-markers (baseline/progressive) bevatten de afmetingen — DHT/DAC (C4/C8/CC)
    // vallen toevallig in hetzelfde bereik en moeten expliciet overgeslagen worden.
    const isSofMarker = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSofMarker) {
      if (offset + 9 > buf.length) return null;
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + segLength;
  }
  return null;
}

/** Haalt de intrinsieke pixelafmetingen van een afbeelding op — nodig om een
 * e-mailafbeelding op een exacte hoogte (of breedte) te tonen zonder scheeftrekking in
 * Outlook desktop: die client rendert een <img> op basis van de HTML width/height-
 * ATTRIBUTEN (niet de CSS), dus een losse `style="height:56px"` zonder passend
 * `width`-attribuut levert daar een samengedrukte afbeelding op (zie
 * email/event-branding.ts's eventBrandingVars). Best-effort: geeft `null` bij een netwerkfout of
 * een formaat dat niet PNG/JPEG is (zelfde beperking als tickets/pdf.ts's embedImage). */
export async function getImageDimensions(url: string): Promise<ImageDimensions | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("png") || url.endsWith(".png")) return readPngDimensions(buf);
    if (contentType.includes("jpeg") || contentType.includes("jpg") || /\.jpe?g$/.test(url)) {
      return readJpegDimensions(buf);
    }
    return null;
  } catch {
    return null;
  }
}
