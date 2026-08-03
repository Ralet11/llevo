-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "providerPreferenceId" TEXT,
ADD COLUMN "providerPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPreferenceId_key" ON "Payment"("providerPreferenceId");
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
