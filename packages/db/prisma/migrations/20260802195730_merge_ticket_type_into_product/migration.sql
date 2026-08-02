-- Fase 5: TicketType en Product samenvoegen tot één Product-model (kind: TICKET/
-- MERCHANDISE). Zie docs/architectuurvoorstel.md ("Fase 5 — één Product-model").
-- Data-behoudende migratie: bestaande ticket_types-rijen worden overgezet naar products
-- met behoud van hun id, zodat losse verwijzingen (order_items, tickets) automatisch
-- blijven kloppen zonder een aparte mapping-tabel.

-- 1. Nieuw enum + kind-kolom op products.
CREATE TYPE "ProductKind" AS ENUM ('TICKET', 'MERCHANDISE');
ALTER TABLE "products" ADD COLUMN "kind" "ProductKind" NOT NULL DEFAULT 'MERCHANDISE';

-- 2. Bestaande ticket_types-rijen overzetten naar products (zelfde id behouden).
INSERT INTO "products" (id, "eventId", name, description, "priceCents", currency, "totalStock", "reservedStock", "soldStock", "isActive", kind, "createdAt", "updatedAt")
SELECT id, "eventId", name, description, "priceCents", currency, "totalStock", "reservedStock", "soldStock", "isActive", 'TICKET', "createdAt", "updatedAt"
FROM "ticket_types";

-- 3. order_items: backfill productId vanaf ticketTypeId, dan de CHECK-constraint en de
-- oude kolom/index/FK weg, en productId verplicht maken.
UPDATE "order_items" SET "productId" = "ticketTypeId" WHERE "productId" IS NULL AND "ticketTypeId" IS NOT NULL;
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_exactly_one_kind_check";
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_ticketTypeId_fkey";
DROP INDEX "order_items_ticketTypeId_idx";
ALTER TABLE "order_items" DROP COLUMN "ticketTypeId";
ALTER TABLE "order_items" ALTER COLUMN "productId" SET NOT NULL;

-- 4. tickets: nieuwe productId-kolom i.p.v. ticketTypeId, met een echte FK naar products
-- (had voorheen geen Prisma-relatie/FK-constraint — kleine, laagrisico-verbetering).
ALTER TABLE "tickets" ADD COLUMN "productId" TEXT;
UPDATE "tickets" SET "productId" = "ticketTypeId";
ALTER TABLE "tickets" ALTER COLUMN "productId" SET NOT NULL;
ALTER TABLE "tickets" DROP COLUMN "ticketTypeId";
CREATE INDEX "tickets_productId_idx" ON "tickets"("productId");
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. ticket_types-tabel is nu leeg overbodig.
ALTER TABLE "ticket_types" DROP CONSTRAINT "ticket_types_eventId_fkey";
DROP TABLE "ticket_types";
