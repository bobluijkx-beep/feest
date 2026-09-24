-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "mailingCampaignId" TEXT;

-- CreateIndex
CREATE INDEX "orders_mailingCampaignId_idx" ON "orders"("mailingCampaignId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_mailingCampaignId_fkey" FOREIGN KEY ("mailingCampaignId") REFERENCES "email_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
