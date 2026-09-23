-- AlterTable
ALTER TABLE "email_campaigns" ADD COLUMN     "mailingTemplateId" TEXT;

-- CreateTable
CREATE TABLE "mailing_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "layoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailing_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mailing_templates_organizationId_idx" ON "mailing_templates"("organizationId");

-- AddForeignKey
ALTER TABLE "mailing_templates" ADD CONSTRAINT "mailing_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_templates" ADD CONSTRAINT "mailing_templates_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "email_layouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_mailingTemplateId_fkey" FOREIGN KEY ("mailingTemplateId") REFERENCES "mailing_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
