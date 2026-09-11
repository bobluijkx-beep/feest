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
  artist: string;
  title: string;
  count: number;
  requesterNames: string[];
}

/** Ongevoelig voor hoofdletters/dubbele spaties, zodat "Queen" en "queen " als hetzelfde
 * verzoek meetellen bij het groeperen. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Groepeert alle verzoeken van een event op artiest+titel (zie normalize), geteld en
 * gesorteerd van meest naar minst aangevraagd — de ranglijst voor de admin
 * (apps/admin/app/(dashboard)/song-requests). */
export async function getRankedSongRequests(eventId: string): Promise<RankedSongRequest[]> {
  const rows = await prisma.songRequest.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: { artist: true, title: true, requesterName: true },
  });

  const groups = new Map<string, RankedSongRequest>();
  for (const row of rows) {
    const key = `${normalize(row.artist)}|||${normalize(row.title)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.requesterNames.push(row.requesterName);
    } else {
      groups.set(key, { artist: row.artist, title: row.title, count: 1, requesterNames: [row.requesterName] });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}
