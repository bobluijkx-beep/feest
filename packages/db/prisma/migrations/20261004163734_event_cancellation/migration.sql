-- CreateEnum
CREATE TYPE "CancellationChoice" AS ENUM ('REFUND', 'DONATE');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cancellation_notices" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "choice" "CancellationChoice",
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "chosenAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellation_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_notices_token_key" ON "cancellation_notices"("token");

-- CreateIndex
CREATE INDEX "cancellation_notices_eventId_idx" ON "cancellation_notices"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_notices_eventId_email_key" ON "cancellation_notices"("eventId", "email");

-- AddForeignKey
ALTER TABLE "cancellation_notices" ADD CONSTRAINT "cancellation_notices_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
