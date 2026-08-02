-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_ticketTypeId_fkey";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "productId" TEXT,
ALTER COLUMN "ticketTypeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "totalStock" INTEGER NOT NULL,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "soldStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_eventId_idx" ON "products"("eventId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint: een OrderItem verwijst naar precies één van ticketTypeId/productId
-- (zie docs/architectuurvoorstel.md, "Uitbreiding: merchandise & generieke webshop").
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_exactly_one_kind_check"
  CHECK (("ticketTypeId" IS NOT NULL) != ("productId" IS NOT NULL));

-- Defense-in-depth (zelfde patroon als 20260723231100_enable_rls_default_deny): RLS aan
-- op de nieuwe tabel, geen policies, dus anon/authenticated kunnen er standaard niets
-- direct via PostgREST/Supabase-client mee doen.
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
