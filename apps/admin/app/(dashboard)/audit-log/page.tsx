import Link from "next/link";
import { prisma } from "@lions/core";
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
    <main>
      <h1>Audit-log</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Tijdstip</th>
            <th align="left">Actie</th>
            <th align="left">Door</th>
            <th align="left">Entiteit</th>
            <th align="left">Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{entry.createdAt.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</td>
              <td>{entry.action}</td>
              <td>{entry.actorUserId ? (emailById.get(entry.actorUserId) ?? entry.actorUserId) : "systeem"}</td>
              <td>
                {entry.entityType} ({entry.entityId})
              </td>
              <td>
                <code>{entry.metadata ? JSON.stringify(entry.metadata) : ""}</code>
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5}>Nog geen regels.</td>
            </tr>
          )}
        </tbody>
      </table>

      <p>
        Pagina {page} van {totalPages}.{" "}
        {page > 1 && <Link href={`/audit-log?page=${page - 1}`}>← Vorige</Link>}{" "}
        {page < totalPages && <Link href={`/audit-log?page=${page + 1}`}>Volgende →</Link>}
      </p>
    </main>
  );
}
