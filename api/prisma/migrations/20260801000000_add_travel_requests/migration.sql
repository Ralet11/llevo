-- CreateEnum
CREATE TYPE "TravelRequestStatus" AS ENUM ('SEARCHING', 'PUBLISHED', 'MATCHED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TravelRequestCandidateStatus" AS ENUM ('NOTIFIED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "RideBooking" ADD COLUMN "travelRequestId" TEXT;

-- CreateTable
CREATE TABLE "TravelRequest" (
    "id" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "status" "TravelRequestStatus" NOT NULL DEFAULT 'SEARCHING',
    "searchDeadline" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "matchedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "matchedRouteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequestCandidate" (
    "id" TEXT NOT NULL,
    "travelRequestId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" "TravelRequestCandidateStatus" NOT NULL DEFAULT 'NOTIFIED',
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelRequestCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RideBooking_travelRequestId_key" ON "RideBooking"("travelRequestId");
CREATE INDEX "TravelRequest_passengerId_status_idx" ON "TravelRequest"("passengerId", "status");
CREATE INDEX "TravelRequest_status_searchDeadline_idx" ON "TravelRequest"("status", "searchDeadline");
CREATE INDEX "TravelRequest_status_date_idx" ON "TravelRequest"("status", "date");
CREATE INDEX "TravelRequest_matchedRouteId_idx" ON "TravelRequest"("matchedRouteId");
-- Evita que una doble pulsación o dos requests concurrentes creen la misma
-- intención activa para el mismo pasajero y servicio.
CREATE UNIQUE INDEX "TravelRequest_active_passenger_trip_key"
  ON "TravelRequest"("passengerId", "originCity", "destinationCity", "date", "seats")
  WHERE "status" IN ('SEARCHING', 'PUBLISHED', 'MATCHED', 'CONFIRMED');
CREATE UNIQUE INDEX "TravelRequestCandidate_travelRequestId_routeId_key" ON "TravelRequestCandidate"("travelRequestId", "routeId");
CREATE INDEX "TravelRequestCandidate_driverId_status_idx" ON "TravelRequestCandidate"("driverId", "status");
CREATE INDEX "TravelRequestCandidate_travelRequestId_status_idx" ON "TravelRequestCandidate"("travelRequestId", "status");

-- AddForeignKey
ALTER TABLE "RideBooking" ADD CONSTRAINT "RideBooking_travelRequestId_fkey" FOREIGN KEY ("travelRequestId") REFERENCES "TravelRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_matchedRouteId_fkey" FOREIGN KEY ("matchedRouteId") REFERENCES "DriverRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TravelRequestCandidate" ADD CONSTRAINT "TravelRequestCandidate_travelRequestId_fkey" FOREIGN KEY ("travelRequestId") REFERENCES "TravelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TravelRequestCandidate" ADD CONSTRAINT "TravelRequestCandidate_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DriverRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TravelRequestCandidate" ADD CONSTRAINT "TravelRequestCandidate_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
