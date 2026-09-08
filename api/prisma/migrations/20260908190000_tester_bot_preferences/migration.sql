ALTER TABLE "User"
  ADD COLUMN "demoRideBotEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "demoShipmentBotEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isDemoBot" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Shipment"
  ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "isDemoBot" = true
WHERE "email" = 'demo-ride-driver@llevo.invalid'
   OR "email" = 'demo-shipment-driver@llevo.invalid'
   OR "email" LIKE 'demo-ride-%@llevo.invalid';
