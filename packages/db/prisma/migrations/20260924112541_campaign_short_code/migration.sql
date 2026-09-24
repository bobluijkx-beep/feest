-- AlterTable
ALTER TABLE "email_campaigns" ADD COLUMN "shortCode" TEXT;

-- Backfill: bestaande campagnes (vóór dit veld bestond) krijgen een willekeurige placeholder-code.
-- Hun oorspronkelijke {{ticketlink}} (met ?ref=<id>) is toen al verstuurd en blijft ongewijzigd
-- werken via create-order.ts's directe id-validatie; deze code wordt alleen gebruikt als er
-- vanaf nu nog een nieuwe /tickets/<code>-link voor zo'n oude campagne nodig zou zijn.
UPDATE "email_campaigns" SET "shortCode" = substr(md5(random()::text || id), 1, 8) WHERE "shortCode" IS NULL;

-- AlterTable
ALTER TABLE "email_campaigns" ALTER COLUMN "shortCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "email_campaigns_shortCode_key" ON "email_campaigns"("shortCode");
