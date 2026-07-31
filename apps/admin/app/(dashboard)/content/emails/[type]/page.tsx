import { notFound } from "next/navigation";
import { prisma, defaultEmailTemplates } from "@lions/core";
import type { EmailTemplateType } from "@lions/db";
import { requireStaffRole } from "@/lib/require-role";
import { EmailTemplateForm } from "../email-template-form";

const VALID_TYPES: EmailTemplateType[] = ["ORDER_CONFIRMATION", "PAYMENT_FAILED", "PAYMENT_REMINDER", "CANCELLED"];

export default async function EmailTemplateEditPage({ params }: { params: Promise<{ type: string }> }) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { type } = await params;

  if (!VALID_TYPES.includes(type as EmailTemplateType)) notFound();
  const templateType = type as EmailTemplateType;

  const event = await prisma.event.findFirst({ where: { organizationId: actor.organizationId } });
  if (!event) notFound();

  const existing = await prisma.emailTemplate.findUnique({
    where: { eventId_type_language: { eventId: event.id, type: templateType, language: "nl" } },
  });
  const initial = existing ?? defaultEmailTemplates[templateType];

  return (
    <main>
      <h1>E-mailtemplate: {templateType}</h1>
      <EmailTemplateForm eventId={event.id} type={templateType} subject={initial.subject} bodyHtml={initial.bodyHtml} />
    </main>
  );
}
