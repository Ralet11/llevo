-- CreateEnum
CREATE TYPE "DriverRouteKind" AS ENUM ('INTERCITY', 'LOCAL');

-- CreateEnum
CREATE TYPE "RideBookingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "DriverRoute" ADD COLUMN     "carriesPassengers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "DriverRouteKind" NOT NULL DEFAULT 'INTERCITY',
ADD COLUMN     "pricePerSeat" DOUBLE PRECISION,
ADD COLUMN     "seatsOffered" INTEGER,
ADD COLUMN     "vehicleId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "rideBookingId" TEXT;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "licensePlate" TEXT,
    "model" TEXT,
    "color" TEXT,
    "seats" INTEGER NOT NULL DEFAULT 4,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverDayOff" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverDayOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideBooking" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "originCity" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "pricePerSeat" DOUBLE PRECISION,
    "status" "RideBookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverDayOff_driverId_date_key" ON "DriverDayOff"("driverId", "date");

-- CreateIndex
CREATE INDEX "RideBooking_routeId_date_idx" ON "RideBooking"("routeId", "date");

-- CreateIndex
CREATE INDEX "RideBooking_passengerId_idx" ON "RideBooking"("passengerId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_rideBookingId_key" ON "Payment"("rideBookingId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rideBookingId_fkey" FOREIGN KEY ("rideBookingId") REFERENCES "RideBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverRoute" ADD CONSTRAINT "DriverRoute_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverDayOff" ADD CONSTRAINT "DriverDayOff_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideBooking" ADD CONSTRAINT "RideBooking_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DriverRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideBooking" ADD CONSTRAINT "RideBooking_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
