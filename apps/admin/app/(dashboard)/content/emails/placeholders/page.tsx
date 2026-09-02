import Link from "next/link";
import { prisma, SYSTEM_PLACEHOLDER_DEFS } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, buttonVariants } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { DeletePlaceholderButton } from "./delete-placeholder-button";
import { SystemPlaceholderForm } from "./system-placeholder-form";

export default async function CustomPlaceholdersPage() {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const [placeholders, systemOverrides] = await Promise.all([
    prisma.customPlaceholder.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { key: "asc" },
    }),
    prisma.systemPlaceholderOverride.findMany({ where: { organizationId: actor.organizationId } }),
  ]);
  const systemOverrideByKey = new Map(systemOverrides.map((row) => [row.key, row.template]));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Bewoording van systeem-placeholders</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          <p className="mb-2 text-sm text-muted-foreground">
            Deze drie systeem-placeholders (packages/core) tonen automatisch de juiste gegevens per bestelling —
            hieronder pas je alleen de omringende tekst aan, niet welke bestellingen deze te zien krijgen.
          </p>
          {SYSTEM_PLACEHOLDER_DEFS.map((def) => (
            <SystemPlaceholderForm
              key={def.key}
              placeholderKey={def.key}
              label={def.label}
              helpText={def.helpText}
              hasValue={def.hasValue}
              template={systemOverrideByKey.get(def.key) ?? def.defaultTemplate}
              isOverridden={systemOverrideByKey.has(def.key)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Eigen {"{{placeholder}}"}&apos;s met een vaste waarde (bv. {"{{clubadres}}"}) — bruikbaar in
          e-mailtemplates, mailings en lay-outs, naast de systeem-placeholders zoals {"{{voornaam}}"}.
        </p>
        <Link href="/content/emails/placeholders/nieuw" className={buttonVariants({ size: "sm" })}>
          Nieuwe placeholder
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sleutel</TableHead>
            <TableHead>Omschrijving</TableHead>
            <TableHead>Waarde</TableHead>
            <TableHead>Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {placeholders.map((placeholder) => (
            <TableRow key={placeholder.id}>
              <TableCell className="font-mono text-xs">{`{{${placeholder.key}}}`}</TableCell>
              <TableCell className="text-muted-foreground">{placeholder.description ?? "—"}</TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">{placeholder.valueHtml}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/content/emails/placeholders/${placeholder.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Bewerken
                  </Link>
                  <DeletePlaceholderButton id={placeholder.id} keyValue={placeholder.key} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {placeholders.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nog geen eigen placeholders.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
