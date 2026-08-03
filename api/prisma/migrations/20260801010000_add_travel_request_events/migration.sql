-- CreateEnum
CREATE TYPE "TravelRequestEventType" AS ENUM ('CREATED', 'CANDIDATES_NOTIFIED', 'PUBLISHED', 'MATCHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TravelRequestEvent" (
    "id" TEXT NOT NULL,
    "travelRequestId" TEXT NOT NULL,
    "type" "TravelRequestEventType" NOT NULL,
    "actorUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TravelRequestEvent_travelRequestId_createdAt_idx" ON "TravelRequestEvent"("travelRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "TravelRequestEvent" ADD CONSTRAINT "TravelRequestEvent_travelRequestId_fkey" FOREIGN KEY ("travelRequestId") REFERENCES "TravelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
