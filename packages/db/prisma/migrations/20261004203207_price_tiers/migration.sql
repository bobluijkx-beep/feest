-- CreateEnum
CREATE TYPE "PriceTierMode" AS ENUM ('EVERY_NTH_FREE', 'TIER_TABLE');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "priceTierGroupId" TEXT;

-- CreateTable
CREATE TABLE "price_tier_groups" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "PriceTierMode" NOT NULL,
    "freeEvery" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_tier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_tiers" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,

    CONSTRAINT "price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_tier_groups_eventId_idx" ON "price_tier_groups"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "price_tiers_groupId_quantity_key" ON "price_tiers"("groupId", "quantity");

-- CreateIndex
CREATE INDEX "products_priceTierGroupId_idx" ON "products"("priceTierGroupId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_priceTierGroupId_fkey" FOREIGN KEY ("priceTierGroupId") REFERENCES "price_tier_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_tier_groups" ADD CONSTRAINT "price_tier_groups_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "price_tier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
