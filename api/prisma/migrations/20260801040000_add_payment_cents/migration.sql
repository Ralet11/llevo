ALTER TABLE "Payment"
  ADD COLUMN "amountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "platformFeeCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "netAmountCents" INTEGER NOT NULL DEFAULT 0;

UPDATE "Payment"
SET
  "amountCents" = ROUND("amount" * 100),
  "platformFeeCents" = ROUND("platformFee" * 100),
  "netAmountCents" = ROUND("netAmount" * 100)
WHERE "amountCents" = 0;
