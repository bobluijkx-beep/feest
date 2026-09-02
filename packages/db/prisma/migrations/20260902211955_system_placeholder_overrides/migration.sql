-- CreateTable
CREATE TABLE "system_placeholder_overrides" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_placeholder_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_placeholder_overrides_organizationId_key_key" ON "system_placeholder_overrides"("organizationId", "key");

-- AddForeignKey
ALTER TABLE "system_placeholder_overrides" ADD CONSTRAINT "system_placeholder_overrides_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

