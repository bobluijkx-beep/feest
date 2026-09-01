-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "orders_isVisible_idx" ON "orders"("isVisible");

