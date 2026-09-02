import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { LayoutForm } from "../layout-form";

export default async function EditEmailLayoutPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { id } = await params;

  const layout = await prisma.emailLayout.findUnique({ where: { id } });
  if (!layout || layout.organizationId !== actor.organizationId) notFound();

  const customPlaceholders = await prisma.customPlaceholder.findMany({
    where: { organizationId: actor.organizationId },
    select: { key: true },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lay-out: {layout.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <LayoutForm
          id={layout.id}
          name={layout.name}
          bodyHtml={layout.bodyHtml}
          isDefault={layout.isDefault}
          customPlaceholderKeys={customPlaceholders.map((p) => p.key)}
        />
      </CardContent>
    </Card>
  );
}
