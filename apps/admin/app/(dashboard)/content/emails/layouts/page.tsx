import Link from "next/link";
import { prisma } from "@lions/core";
import { Card, CardContent, Badge, buttonVariants } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";

export default async function EmailLayoutsPage() {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const layouts = await prisma.emailLayout.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Een lay-out is de vaste &ldquo;envelop&rdquo; (kopbalk, kleuren, voettekst) rond een e-mail. Kies per
          e-mailtemplate of mailing welke lay-out gebruikt wordt.
        </p>
        <Link href="/content/emails/layouts/nieuw" className={buttonVariants({ size: "sm" })}>
          Nieuwe lay-out
        </Link>
      </div>

      {layouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen lay-outs — er wordt de meegeleverde standaard gebruikt.</p>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {layouts.map((layout) => (
              <Link
                key={layout.id}
                href={`/content/emails/layouts/${layout.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50"
              >
                <span>{layout.name}</span>
                {layout.isDefault && <Badge>standaard</Badge>}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
