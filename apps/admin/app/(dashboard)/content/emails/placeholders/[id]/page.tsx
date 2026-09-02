import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { PlaceholderForm } from "../placeholder-form";

export default async function EditCustomPlaceholderPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { id } = await params;

  const placeholder = await prisma.customPlaceholder.findUnique({ where: { id } });
  if (!placeholder || placeholder.organizationId !== actor.organizationId) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Placeholder: {`{{${placeholder.key}}}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <PlaceholderForm
          id={placeholder.id}
          keyValue={placeholder.key}
          valueHtml={placeholder.valueHtml}
          description={placeholder.description ?? ""}
        />
      </CardContent>
    </Card>
  );
}
