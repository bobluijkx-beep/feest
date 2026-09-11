-- CreateTable
CREATE TABLE "song_requests" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "song_requests_eventId_idx" ON "song_requests"("eventId");

-- CreateIndex
CREATE INDEX "song_requests_orderId_idx" ON "song_requests"("orderId");

-- AddForeignKey
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
