"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, logAudit } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function contentFromFormData(type: string, formData: FormData): Record<string, string> {
  switch (type) {
    case "hero":
      return {
        title: field(formData, "title"),
        subtitle: field(formData, "subtitle"),
        imageUrl: field(formData, "imageUrl"),
      };
    case "programme":
      return { title: field(formData, "title"), body: field(formData, "body") };
    case "sponsor":
      return {
        name: field(formData, "name"),
        logoUrl: field(formData, "logoUrl"),
        link: field(formData, "link"),
      };
    case "faq_item":
      return { question: field(formData, "question"), answer: field(formData, "answer") };
    case "cta":
      return { label: field(formData, "label"), href: field(formData, "href") };
    default:
      return {};
  }
}

export async function createPageBlock(formData: FormData): Promise<void> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const eventId = String(formData.get("eventId") ?? "");
  const type = String(formData.get("type") ?? "");
  const order = Number(formData.get("order") ?? 0);
  const isPublished = formData.get("isPublished") === "on";

  if (!eventId || !type) redirect("/content/pages");

  const block = await prisma.pageBlock.create({
    data: { eventId, type, order, isPublished, content: contentFromFormData(type, formData) },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "page_block_created",
    entityType: "page_block",
    entityId: block.id,
    metadata: { type, isPublished },
  });

  revalidatePath("/content/pages");
  redirect("/content/pages");
}

export async function updatePageBlock(formData: FormData): Promise<void> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const id = String(formData.get("id") ?? "");
  const type = String(formData.get("type") ?? "");
  const order = Number(formData.get("order") ?? 0);
  const isPublished = formData.get("isPublished") === "on";
  if (!id || !type) redirect("/content/pages");

  await prisma.pageBlock.update({
    where: { id },
    data: { order, isPublished, content: contentFromFormData(type, formData) },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "page_block_updated",
    entityType: "page_block",
    entityId: id,
    metadata: { type, isPublished },
  });

  revalidatePath("/content/pages");
  redirect("/content/pages");
}

export async function deletePageBlock(formData: FormData): Promise<void> {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.pageBlock.delete({ where: { id } });

  await logAudit({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "page_block_deleted",
    entityType: "page_block",
    entityId: id,
  });

  revalidatePath("/content/pages");
  redirect("/content/pages");
}
