import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { PlaceholderForm } from "../placeholder-form";

export default async function NewCustomPlaceholderPage() {
  await requireStaffRole(["ADMIN", "EDITOR"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuwe placeholder</CardTitle>
      </CardHeader>
      <CardContent>
        <PlaceholderForm keyValue="" valueHtml="" description="" />
      </CardContent>
    </Card>
  );
}
