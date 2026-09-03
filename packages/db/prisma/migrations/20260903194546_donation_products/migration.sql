-- AlterEnum
ALTER TYPE "ProductKind" ADD VALUE 'DONATION';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "donationPresetsCents" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

