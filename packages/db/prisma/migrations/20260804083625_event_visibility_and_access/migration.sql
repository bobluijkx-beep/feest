-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productId_fkey";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "event_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "event_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_access_userId_eventId_key" ON "event_access"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_access" ADD CONSTRAINT "event_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_access" ADD CONSTRAINT "event_access_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
