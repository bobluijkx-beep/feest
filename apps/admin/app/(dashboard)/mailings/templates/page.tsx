import Link from "next/link";
import { prisma } from "@lions/core";
import {
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  buttonVariants,
} from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { duplicateTemplate } from "./actions";
import { DeleteTemplateButton } from "./delete-template-button";

export default async function MailingTemplatesPage() {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const templates = await prisma.mailingTemplate.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, subject: true, updatedAt: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Herbruikbare mailing-inhoud, los van een doelgroep — kies &apos;m pas bij het versturen zelf (Doelgroep
          &amp; versturen).
        </p>
        <Link href="/mailings/templates/new" className={buttonVariants({ size: "sm" })}>
          + Nieuwe template
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Onderwerp</TableHead>
                <TableHead>Laatst gewijzigd</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/mailings/templates/${t.id}`} className="text-primary hover:underline">
                      {t.name}
                    </Link>
                  </TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell>{t.updatedAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <form action={duplicateTemplate}>
                        <input type="hidden" name="id" value={t.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Kopiëren
                        </Button>
                      </form>
                      {actor.role === "ADMIN" && <DeleteTemplateButton id={t.id} name={t.name} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nog geen templates.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
