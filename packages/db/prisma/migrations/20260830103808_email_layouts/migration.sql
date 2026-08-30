-- AlterTable
ALTER TABLE "email_campaigns" ADD COLUMN     "layoutId" TEXT;

-- AlterTable
ALTER TABLE "email_templates" ADD COLUMN     "layoutId" TEXT;

-- CreateTable
CREATE TABLE "email_layouts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_layouts_organizationId_idx" ON "email_layouts"("organizationId");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "email_layouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "email_layouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_layouts" ADD CONSTRAINT "email_layouts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

