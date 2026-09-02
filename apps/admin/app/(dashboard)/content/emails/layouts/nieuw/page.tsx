import { prisma } from "@lions/core";
import { DEFAULT_LAYOUT_HTML } from "@lions/core/email/layout";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { LayoutForm } from "../layout-form";

export default async function NewEmailLayoutPage() {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const customPlaceholders = await prisma.customPlaceholder.findMany({
    where: { organizationId: actor.organizationId },
    select: { key: true },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuwe e-maillay-out</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Start vanaf de meegeleverde standaard i.p.v. een leeg veld — de verplichte
            {{content}}-placeholder en de basisopmaak staan er dan al in. */}
        <LayoutForm
          name=""
          bodyHtml={DEFAULT_LAYOUT_HTML}
          isDefault={false}
          customPlaceholderKeys={customPlaceholders.map((p) => p.key)}
        />
      </CardContent>
    </Card>
  );
}
