import "server-only";
import type { Prisma } from "@lions/db";
import { prisma } from "../db";

/** Schrijft één AuditLog-regel. Nooit geheime waarden (API-keys e.d.) in `metadata` —
 * alleen wát er gewijzigd is, niet de waarde zelf. */
export async function logAudit(params: {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
