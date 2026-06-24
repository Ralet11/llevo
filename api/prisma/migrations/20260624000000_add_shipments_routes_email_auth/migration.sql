-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTO', 'AUTO', 'CAMIONETA', 'CAMION');

-- CreateEnum
CREATE TYPE "PackageSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'BULKY');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('SEARCHING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'NO_COVERAGE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_tripId_fkey";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "shipmentJobId" TEXT,
ALTER COLUMN "tripId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pushToken" TEXT;

-- CreateTable
CREATE TABLE "DriverRoute" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "waypointCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "destinationCity" TEXT NOT NULL,
    "daysOfWeek" "DayOfWeek"[],
    "departureTimeFrom" TEXT,
    "departureTimeTo" TEXT,
    "vehicleType" "VehicleType" NOT NULL,
    "licensePlate" TEXT,
    "vehicleModel" TEXT,
    "vehicleColor" TEXT,
    "maxWeightKg" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "originAddress" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "packageSize" "PackageSize" NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "pickupContactName" TEXT NOT NULL,
    "pickupContactPhone" TEXT NOT NULL,
    "recipientDetails" TEXT NOT NULL,
    "notes" TEXT,
    "candidateDriverIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastNotifiedAt" TIMESTAMP(3),
    "status" "ShipmentStatus" NOT NULL DEFAULT 'SEARCHING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentJob" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAuthCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "EmailAuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentJob_shipmentId_key" ON "ShipmentJob"("shipmentId");

-- CreateIndex
CREATE INDEX "EmailAuthCode_email_createdAt_idx" ON "EmailAuthCode"("email", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_shipmentJobId_key" ON "Payment"("shipmentJobId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shipmentJobId_fkey" FOREIGN KEY ("shipmentJobId") REFERENCES "ShipmentJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverRoute" ADD CONSTRAINT "DriverRoute_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentJob" ADD CONSTRAINT "ShipmentJob_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentJob" ADD CONSTRAINT "ShipmentJob_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentJob" ADD CONSTRAINT "ShipmentJob_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DriverRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAuthCode" ADD CONSTRAINT "EmailAuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

