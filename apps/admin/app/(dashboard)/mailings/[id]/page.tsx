import { notFound } from "next/navigation";
import { prisma, hasEventAccess } from "@lions/core";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { id } = await params;

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id },
    include: { event: { select: { name: true } } },
  });
  if (!campaign || campaign.organizationId !== actor.organizationId) notFound();
  if (!(await hasEventAccess(actor, campaign.eventId))) notFound();

  const failedRecipients = await prisma.emailCampaignRecipient.findMany({
    where: { campaignId: campaign.id, status: "FAILED" },
    select: { email: true, error: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{campaign.subject}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Event: {campaign.event.name} — <Badge>{campaign.status}</Badge>
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground">
              <p className="text-xs text-primary-foreground/80">Totaal</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{campaign.totalRecipients}</p>
            </div>
            <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground">
              <p className="text-xs text-primary-foreground/80">Verzonden</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{campaign.sentCount}</p>
            </div>
            <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground">
              <p className="text-xs text-primary-foreground/80">Mislukt</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{campaign.failedCount}</p>
            </div>
            <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground">
              <p className="text-xs text-primary-foreground/80">Afgemeld</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{campaign.skippedCount}</p>
            </div>
          </div>
          {campaign.status !== "DONE" && (
            <p className="text-xs text-muted-foreground">
              Deze mailing wordt nog verstuurd — ververs de pagina voor de laatste stand.
            </p>
          )}
        </CardContent>
      </Card>

      {failedRecipients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mislukte verzendingen</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mailadres</TableHead>
                  <TableHead>Foutmelding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedRecipients.map((r) => (
                  <TableRow key={r.email}>
                    <TableCell>{r.email}</TableCell>
                    <TableCell className="text-destructive">{r.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
