-- Apply to the production PostgreSQL database in a maintenance window after a verified backup.
BEGIN;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
UPDATE "User" SET "role" = 'CUSTOMER' WHERE UPPER("role") = 'USER';

ALTER TABLE "Vendor"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "coverImage" TEXT,
  ADD COLUMN IF NOT EXISTS "pickupInstructions" TEXT,
  ADD COLUMN IF NOT EXISTS "temporaryClosed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "preparationMinutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "orderCapacity" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS "reviewReason" TEXT,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bankAccountType" TEXT,
  ADD COLUMN IF NOT EXISTS "bankVerificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "liquorLicenceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "liquorLicenceNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "liquorLicenceHolder" TEXT,
  ADD COLUMN IF NOT EXISTS "liquorLicencePremises" TEXT,
  ADD COLUMN IF NOT EXISTS "liquorLicenceProvince" TEXT,
  ADD COLUMN IF NOT EXISTS "liquorLicenceType" TEXT,
  ADD COLUMN IF NOT EXISTS "liquorLicenceExpiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "liquorVerificationStatus" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN IF NOT EXISTS "liquorReviewReason" TEXT;
ALTER TABLE "Vendor" ALTER COLUMN "isActive" SET DEFAULT false;
ALTER TABLE "Vendor" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
UPDATE "Vendor" SET "status" = 'SUBMITTED' WHERE UPPER("status") IN ('PENDING', 'SUBMITTED_FOR_APPROVAL');

ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "isAlcohol" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Product'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SUBMITTED';
    UPDATE "Product" SET "status" = 'APPROVED';
  END IF;
END $$;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "reviewReason" TEXT;
CREATE INDEX IF NOT EXISTS "Product_status_updatedAt_idx" ON "Product"("status", "updatedAt");

ALTER TABLE "RiderApplication"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "idDocumentUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "licenceDocumentUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "licenceExpiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "province" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "municipality" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "township" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "sectionArea" TEXT,
  ADD COLUMN IF NOT EXISTS "preferredZones" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "vehicleMakeModel" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleDocumentUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "availableNow" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "workingDays" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "startTime" TEXT,
  ADD COLUMN IF NOT EXISTS "endTime" TEXT,
  ADD COLUMN IF NOT EXISTS "lawfulWorkDeclared" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "conductAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "liquorIdCheckAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT,
  ADD COLUMN IF NOT EXISTS "bankName" TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "bankBranchCode" TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountType" TEXT,
  ADD COLUMN IF NOT EXISTS "bankVerificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "reviewReason" TEXT,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "RiderApplication" ALTER COLUMN "idNumberLast4" SET DEFAULT '';
ALTER TABLE "RiderApplication" ALTER COLUMN "licenseCode" SET DEFAULT '';
ALTER TABLE "RiderApplication" ALTER COLUMN "suburb" SET DEFAULT '';
ALTER TABLE "RiderApplication" ALTER COLUMN "city" SET DEFAULT '';
ALTER TABLE "RiderApplication" ALTER COLUMN "vehicleType" SET DEFAULT '';
ALTER TABLE "RiderApplication" ALTER COLUMN "availableHours" SET DEFAULT '';
ALTER TABLE "RiderApplication" ALTER COLUMN "emergencyContactName" SET DEFAULT '';
ALTER TABLE "RiderApplication" ALTER COLUMN "emergencyContactPhone" SET DEFAULT '';
ALTER TABLE "RiderApplication" ALTER COLUMN "hasSmartphone" SET DEFAULT false;
ALTER TABLE "RiderApplication" ALTER COLUMN "hasBankAccount" SET DEFAULT false;
ALTER TABLE "RiderApplication" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
UPDATE "RiderApplication" SET "status" = 'SUBMITTED' WHERE UPPER("status") = 'PENDING';

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "checkoutKey" TEXT,
  ADD COLUMN IF NOT EXISTS "statusReason" TEXT,
  ADD COLUMN IF NOT EXISTS "liquorIdVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paymentCallbackAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "assignedRiderId" TEXT,
  ADD COLUMN IF NOT EXISTS "riderTipCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "riderPayoutCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vendorPayoutCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "platformFeeCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "riderPayoutStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "riderPayoutReference" TEXT,
  ADD COLUMN IF NOT EXISTS "riderPayoutDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "vendorPayoutStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "vendorPayoutReference" TEXT,
  ADD COLUMN IF NOT EXISTS "vendorPayoutDate" TIMESTAMP(3);
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';
UPDATE "Order" SET "status" = 'NEW' WHERE UPPER("status") = 'PLACED';
UPDATE "Order" SET "status" = 'ON_THE_WAY' WHERE UPPER("status") = 'OUT_FOR_DELIVERY';
UPDATE "Order" SET "status" = 'CANCELLED' WHERE UPPER("status") = 'CANCELED';

WITH duplicates AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "ozowTxnId" ORDER BY "createdAt") AS row_number
  FROM "Order" WHERE "ozowTxnId" IS NOT NULL
)
UPDATE "Order" SET "ozowTxnId" = NULL
WHERE "id" IN (SELECT "id" FROM duplicates WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS "Order_ozowTxnId_key" ON "Order"("ozowTxnId");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_checkoutKey_key" ON "Order"("checkoutKey");
CREATE UNIQUE INDEX IF NOT EXISTS "RiderApplication_userId_key" ON "RiderApplication"("userId");
CREATE INDEX IF NOT EXISTS "Order_assignedRiderId_status_createdAt_idx"
  ON "Order"("assignedRiderId", "status", "createdAt");

CREATE TABLE IF NOT EXISTS "PrivacyRequest" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PrivacyRequest_userId_createdAt_idx"
  ON "PrivacyRequest"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PrivacyRequest_status_createdAt_idx"
  ON "PrivacyRequest"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RiderApplication_userId_fkey') THEN
    ALTER TABLE "RiderApplication" ADD CONSTRAINT "RiderApplication_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_assignedRiderId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedRiderId_fkey"
      FOREIGN KEY ("assignedRiderId") REFERENCES "RiderApplication"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PrivacyRequest_userId_fkey') THEN
    ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
