import Link from "next/link";
import { prisma, scopeEventsForActor } from "@lions/core";
import {
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  buttonVariants,
} from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  QUEUED: "secondary",
  SENDING: "secondary",
  DONE: "default",
};

export default async function MailingsPage() {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);

  const allEvents = await prisma.event.findMany({
    where: { organizationId: actor.organizationId },
    select: { id: true },
  });
  const accessibleEventIds = new Set((await scopeEventsForActor(actor, allEvents)).map((e) => e.id));

  const campaigns = await prisma.emailCampaign.findMany({
    where: { organizationId: actor.organizationId, eventId: { in: Array.from(accessibleEventIds) } },
    include: { event: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gepersonaliseerde bulkmail naar een doelgroep deelnemers.</p>
        <Link href="/mailings/new" className={buttonVariants({ size: "sm" })}>
          + Nieuwe mailing
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Onderwerp</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Verzonden</TableHead>
                <TableHead>Aangemaakt op</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/mailings/${c.id}`} className="text-primary hover:underline">
                      {c.subject}
                    </Link>
                  </TableCell>
                  <TableCell>{c.event.name}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.sentCount} / {c.totalRecipients}
                  </TableCell>
                  <TableCell>{c.createdAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</TableCell>
                </TableRow>
              ))}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nog geen mailings verstuurd.
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
