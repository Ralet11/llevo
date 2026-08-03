CREATE TABLE "RouteAlert" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "originCity" TEXT NOT NULL,
  "destinationCity" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "notifiedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RouteAlert_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RouteAlert_userId_originCity_destinationCity_date_key" ON "RouteAlert"("userId", "originCity", "destinationCity", "date");
CREATE INDEX "RouteAlert_date_cancelledAt_idx" ON "RouteAlert"("date", "cancelledAt");
ALTER TABLE "RouteAlert" ADD CONSTRAINT "RouteAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
