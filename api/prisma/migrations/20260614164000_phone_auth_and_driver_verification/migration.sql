-- AlterTable
ALTER TABLE "User"
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateEnum
CREATE TYPE "DriverVerificationStatus" AS ENUM (
  'NOT_STARTED',
  'PENDING',
  'IN_PROGRESS',
  'IN_REVIEW',
  'APPROVED',
  'DECLINED',
  'RESUBMITTED',
  'EXPIRED',
  'ABANDONED',
  'KYC_EXPIRED'
);

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "driverVerificationStatus" "DriverVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "driverVerificationSessionId" TEXT,
  ADD COLUMN "driverVerificationUrl" TEXT,
  ADD COLUMN "driverVerificationSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "driverVerificationCheckedAt" TIMESTAMP(3),
  ADD COLUMN "driverVerificationNotes" TEXT,
  ADD COLUMN "driverVerificationDecision" JSONB,
  ADD COLUMN "driverVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_driverVerificationSessionId_key" ON "User"("driverVerificationSessionId");
