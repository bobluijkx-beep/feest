import { notFound } from "next/navigation";
import { prisma, defaultEmailTemplates } from "@lions/core";
import type { EmailTemplateType } from "@lions/db";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { getSelectedEvent } from "@/lib/selected-event";
import { EmailTemplateForm } from "../email-template-form";

const VALID_TYPES: EmailTemplateType[] = ["ORDER_CONFIRMATION", "PAYMENT_FAILED", "PAYMENT_REMINDER", "CANCELLED"];

export default async function EmailTemplateEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ eventId?: string }>;
}) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { type } = await params;
  const { eventId } = await searchParams;

  if (!VALID_TYPES.includes(type as EmailTemplateType)) notFound();
  const templateType = type as EmailTemplateType;

  const { selected: event } = await getSelectedEvent(actor, eventId);
  if (!event) notFound();

  const existing = await prisma.emailTemplate.findUnique({
    where: { eventId_type_language: { eventId: event.id, type: templateType, language: "nl" } },
  });
  const initial = existing ?? defaultEmailTemplates[templateType];

  const [layouts, customPlaceholders] = await Promise.all([
    prisma.emailLayout.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, bodyHtml: true, isDefault: true },
    }),
    prisma.customPlaceholder.findMany({
      where: { organizationId: actor.organizationId },
      select: { key: true },
    }),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>E-mailtemplate: {templateType}</CardTitle>
      </CardHeader>
      <CardContent>
        <EmailTemplateForm
          eventId={event.id}
          type={templateType}
          subject={initial.subject}
          bodyHtml={initial.bodyHtml}
          layoutId={existing?.layoutId ?? ""}
          layouts={layouts}
          customPlaceholderKeys={customPlaceholders.map((p) => p.key)}
        />
      </CardContent>
    </Card>
  );
}
