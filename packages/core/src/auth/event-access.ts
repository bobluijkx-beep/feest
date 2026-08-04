import "server-only";
import { prisma } from "../db";
import type { AppUser } from "./session";

/** ADMIN/FINANCE zijn org-breed ongelimiteerd; EDITOR/DOOR_STAFF alleen voor de events
 * waar expliciet een EventAccess-rij voor bestaat. */
export async function scopeEventsForActor<T extends { id: string }>(actor: AppUser, events: T[]): Promise<T[]> {
  if (actor.role === "ADMIN" || actor.role === "FINANCE") return events;

  const access = await prisma.eventAccess.findMany({ where: { userId: actor.id }, select: { eventId: true } });
  const allowed = new Set(access.map((a) => a.eventId));
  return events.filter((e) => allowed.has(e.id));
}

export async function hasEventAccess(actor: AppUser, eventId: string): Promise<boolean> {
  if (actor.role === "ADMIN" || actor.role === "FINANCE") return true;

  const count = await prisma.eventAccess.count({ where: { userId: actor.id, eventId } });
  return count > 0;
}
