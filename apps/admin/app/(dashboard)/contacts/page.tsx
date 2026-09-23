import Link from "next/link";
import { getContactStats, listContacts } from "@lions/core";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { EmailOptOutDot } from "@/lib/email-optout-dot";
import { SyncOrderContactsForm, ImportContactsForm } from "./contact-forms";
import { ReactivateContactButton } from "./reactivate-contact-button";

const SOURCE_LABEL: Record<string, string> = { ORDER: "Bestelling", IMPORT: "Import" };

export default async function ContactsPage() {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const [stats, { contacts, truncated }] = await Promise.all([
    getContactStats(actor.organizationId),
    listContacts(actor.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Org-breed opt-in adresboek — herbruikbaar voor mailings bij dit en toekomstige events, los van welke
        bestellingen er voor één specifiek event zijn. Iedereen die zich afmeldt verdwijnt bij de eerstvolgende
        verzending automatisch uit elke doelgroep die dit adresboek gebruikt.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground">
          <p className="text-xs text-primary-foreground/80">Totaal (uniek)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{stats.total}</p>
        </div>
        <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground">
          <p className="text-xs text-primary-foreground/80">Uit bestellingen</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{stats.fromOrders}</p>
        </div>
        <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground">
          <p className="text-xs text-primary-foreground/80">Uit import</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{stats.fromImport}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vanuit bestellingen</CardTitle>
          </CardHeader>
          <CardContent>
            <SyncOrderContactsForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contacten importeren</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportContactsForm />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacten{truncated ? ` (eerste ${contacts.length})` : ` (${contacts.length})`}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>E-mailadres</TableHead>
                <TableHead>Bron</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <EmailOptOutDot optedOut={c.optedOut} />
                      {c.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{SOURCE_LABEL[c.source] ?? c.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.optedOut && <ReactivateContactButton email={c.email} />}
                      <Link href={`/contacts/${c.id}`} className="text-primary hover:underline">
                        Bewerken
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nog geen contacten.
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
