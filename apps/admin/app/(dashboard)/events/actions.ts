"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@lions/db";
import { prisma, logAudit, parseAmsterdamDatetimeLocal } from "@lions/core";
import type { EventStatus } from "@lions/db";
import { requireStaffRole } from "@/lib/require-role";

export interface EventActionState {
  error?: string;
  success?: boolean;
}

const VALID_STATUSES: EventStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface ParsedEventForm {
  name: string;
  slug: string;
  description: string | null;
  venue: string | null;
  startsAt: Date;
  endsAt: Date | null;
  status: EventStatus;
  theme: Prisma.InputJsonValue;
}

function parseEventForm(formData: FormData): ParsedEventForm | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const status = String(formData.get("status") ?? "DRAFT") as EventStatus;
  const primaryColor = String(formData.get("primaryColor") ?? "").trim();
  const backgroundColor = String(formData.get("backgroundColor") ?? "").trim();
  const accentColor = String(formData.get("accentColor") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();

  if (!name) return { error: "Vul een naam in." };
  if (!SLUG_PATTERN.test(slug)) {
    return { error: "Slug mag alleen kleine letters, cijfers en koppeltekens bevatten (bv. 'oliebollen-2026')." };
  }
  if (!startsAtRaw) return { error: "Vul een startdatum/-tijd in." };
  if (!VALID_STATUSES.includes(status)) return { error: "Ongeldige status." };

  return {
    name,
    slug,
    description: description || null,
    venue: venue || null,
    startsAt: parseAmsterdamDatetimeLocal(startsAtRaw),
    endsAt: endsAtRaw ? parseAmsterdamDatetimeLocal(endsAtRaw) : null,
    status,
    theme: { primaryColor, backgroundColor, accentColor, logoUrl },
  };
}

export async function createEvent(_prevState: EventActionState, formData: FormData): Promise<EventActionState> {
  const actor = await requireStaffRole(["ADMIN"]);

  const parsed = parseEventForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    const created = await prisma.event.create({
      data: { organizationId: actor.organizationId, ...parsed },
    });

    await logAudit({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: "event_created",
      entityType: "event",
      entityId: created.id,
      metadata: { name: parsed.name, slug: parsed.slug, status: parsed.status },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: `Er bestaat al een event met slug '${parsed.slug}'.` };
    }
    throw err;
  }

  revalidatePath("/events");
  return { success: true };
}

export async function updateEvent(_prevState: EventActionState, formData: FormData): Promise<EventActionState> {
  const actor = await requireStaffRole(["ADMIN"]);

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Ontbrekend id." };

  const parsed = parseEventForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await prisma.event.update({ where: { id }, data: parsed });

    await logAudit({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: "event_updated",
      entityType: "event",
      entityId: id,
      metadata: { name: parsed.name, slug: parsed.slug, status: parsed.status },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: `Er bestaat al een event met slug '${parsed.slug}'.` };
    }
    throw err;
  }

  revalidatePath("/events");
  return { success: true };
}
