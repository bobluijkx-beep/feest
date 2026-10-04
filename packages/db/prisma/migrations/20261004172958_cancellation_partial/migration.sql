-- AlterEnum
ALTER TYPE "CancellationChoice" ADD VALUE 'PARTIAL';

-- AlterTable
ALTER TABLE "cancellation_notices" ADD COLUMN     "donationCents" INTEGER;
