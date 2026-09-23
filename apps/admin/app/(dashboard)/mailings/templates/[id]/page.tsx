import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { TemplateForm } from "../template-form";

export default async function EditMailingTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { id } = await params;

  const [template, layouts, customPlaceholders] = await Promise.all([
    prisma.mailingTemplate.findUnique({
      where: { id },
      select: { id: true, organizationId: true, name: true, subject: true, bodyHtml: true, layoutId: true },
    }),
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
  if (!template || template.organizationId !== actor.organizationId) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Template bewerken: {template.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <TemplateForm
          template={template}
          layouts={layouts}
          customPlaceholderKeys={customPlaceholders.map((p) => p.key)}
        />
      </CardContent>
    </Card>
  );
}
