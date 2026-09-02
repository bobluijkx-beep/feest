import Link from "next/link";
import { prisma } from "@lions/core";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, buttonVariants } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { DeletePlaceholderButton } from "./delete-placeholder-button";

export default async function CustomPlaceholdersPage() {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const placeholders = await prisma.customPlaceholder.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { key: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
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
