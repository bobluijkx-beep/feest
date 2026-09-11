import "server-only";
import { prisma } from "../db";

export interface SongRequestInput {
  artist: string;
  title: string;
}

const MAX_REQUESTS_PER_ORDER = 2;

export async function getSongRequestsForOrder(orderId: string) {
  return prisma.songRequest.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
}

/** Vervangt alle bestaande verzoeken van deze bestelling door de nieuwe lijst (max 2) —
 * zo blijft een koper die de link nog eens opent (om aan te passen) altijd op maximaal 2
 * verzoeken zitten, ook na meerdere keren opnieuw versturen. */
export async function submitSongRequests(
  orderId: string,
  eventId: string,
  requesterName: string,
  requests: SongRequestInput[],
): Promise<void> {
  const limited = requests.slice(0, MAX_REQUESTS_PER_ORDER);

  await prisma.$transaction([
    prisma.songRequest.deleteMany({ where: { orderId } }),
    ...(limited.length > 0
      ? [
          prisma.songRequest.createMany({
            data: limited.map((r) => ({ orderId, eventId, requesterName, artist: r.artist, title: r.title })),
          }),
        ]
      : []),
  ]);
}

export interface RankedSongRequest {
  /** Stabiele sleutel voor dit groep-rij (genormaliseerde artiest+titel) — te gebruiken als
   * React-key en als selectie-id in de admin-tabel (use-bulk-selection.ts). */
  groupKey: string;
  artist: string;
  title: string;
  count: number;
  requesterNames: string[];
  /** Onderliggende SongRequest-rij-id's van deze groep — een bulkactie (op inactief zetten/
   * verwijderen) werkt hierop, niet op de groep zelf (die bestaat alleen in deze query). */
  requestIds: string[];
}

/** Ongevoelig voor hoofdletters/dubbele spaties, zodat "Queen" en "queen " als hetzelfde
 * verzoek meetellen bij het groeperen. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Groepeert alle verzoeken van een event op artiest+titel (zie normalize), geteld en
 * gesorteerd van meest naar minst aangevraagd — de ranglijst voor de admin
 * (apps/admin/app/(dashboard)/song-requests) en de DJ-pagina (apps/web/app/(site)/dj).
 * `visible` kiest tussen de actieve ranglijst (default) en de afdeling Inactief. */
export async function getRankedSongRequests(eventId: string, visible = true): Promise<RankedSongRequest[]> {
  const rows = await prisma.songRequest.findMany({
    where: { eventId, isVisible: visible },
    orderBy: { createdAt: "asc" },
    select: { id: true, artist: true, title: true, requesterName: true },
  });

  const groups = new Map<string, RankedSongRequest>();
  for (const row of rows) {
    const key = `${normalize(row.artist)}|||${normalize(row.title)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.requesterNames.push(row.requesterName);
      existing.requestIds.push(row.id);
    } else {
      groups.set(key, {
        groupKey: key,
        artist: row.artist,
        title: row.title,
        count: 1,
        requesterNames: [row.requesterName],
        requestIds: [row.id],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

/** Zet een groep verzoeken (alle onderliggende rij-id's van een ranglijst-regel,
 * RankedSongRequest.requestIds) samen op in-/actief — bv. omdat het nummer al gedraaid is op
 * het feest. Werkt op individuele SongRequest-rijen, niet op de groep als geheel (die is
 * puur een query-tijd-groepering, geen eigen tabel). */
export async function bulkSetSongRequestsVisible(ids: string[], isVisible: boolean): Promise<void> {
  if (ids.length === 0) return;
  await prisma.songRequest.updateMany({ where: { id: { in: ids } }, data: { isVisible } });
}

/** Verwijdert een groep verzoeken definitief — alleen bedoeld voor al op inactief gezette
 * rijen (serverside afgedwongen door de aanroeper, net als bulkDeleteOrders). */
export async function bulkDeleteSongRequests(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.songRequest.deleteMany({ where: { id: { in: ids } } });
}
