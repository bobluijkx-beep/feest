import Link from "next/link";
import { prisma } from "@lions/core";
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireStaffRole(["ADMIN"]);
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where: { organizationId: actor.organizationId } }),
  ]);

  const actorIds = [...new Set(entries.map((e) => e.actorUserId).filter((id): id is string => Boolean(id)))];
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } });
  const emailById = new Map(actors.map((a) => [a.id, a.email]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tijdstip</TableHead>
                <TableHead>Actie</TableHead>
                <TableHead>Door</TableHead>
                <TableHead>Entiteit</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.createdAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell>{entry.actorUserId ? (emailById.get(entry.actorUserId) ?? entry.actorUserId) : "systeem"}</TableCell>
                  <TableCell>
                    {entry.entityType} ({entry.entityId})
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">{entry.metadata ? JSON.stringify(entry.metadata) : ""}</code>
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nog geen regels.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Pagina {page} van {totalPages}.{" "}
        {page > 1 && (
          <Link href={`/audit-log?page=${page - 1}`} className="text-primary hover:underline">
            ← Vorige
          </Link>
        )}{" "}
        {page < totalPages && (
          <Link href={`/audit-log?page=${page + 1}`} className="text-primary hover:underline">
            Volgende →
          </Link>
        )}
      </p>
    </div>
  );
}
