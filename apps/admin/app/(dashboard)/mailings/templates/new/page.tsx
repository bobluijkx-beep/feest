import { prisma } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { TemplateForm } from "../template-form";

export default async function NewMailingTemplatePage() {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

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
        <CardTitle>Nieuwe mailing-template</CardTitle>
      </CardHeader>
      <CardContent>
        <TemplateForm layouts={layouts} customPlaceholderKeys={customPlaceholders.map((p) => p.key)} />
      </CardContent>
    </Card>
  );
}
