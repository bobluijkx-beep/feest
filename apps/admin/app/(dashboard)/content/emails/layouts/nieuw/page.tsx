import { DEFAULT_LAYOUT_HTML } from "@lions/core/email/layout";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { LayoutForm } from "../layout-form";

export default async function NewEmailLayoutPage() {
  await requireStaffRole(["ADMIN", "EDITOR"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuwe e-maillay-out</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Start vanaf de meegeleverde standaard i.p.v. een leeg veld — de verplichte
            {{content}}-placeholder en de basisopmaak staan er dan al in. */}
        <LayoutForm name="" bodyHtml={DEFAULT_LAYOUT_HTML} isDefault={false} />
      </CardContent>
    </Card>
  );
}
