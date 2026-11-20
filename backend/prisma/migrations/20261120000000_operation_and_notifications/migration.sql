-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "firstReviewedAt" TIMESTAMP(3),
ADD COLUMN     "responseDueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "HealthUnit" ADD COLUMN     "responseMinutes" INTEGER,
ADD COLUMN     "responsibleUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "consentVersion" TEXT,
ADD COLUMN     "emailConsentAt" TIMESTAMP(3),
ADD COLUMN     "lastEmailVerificationAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payloadCipher" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_status_availableAt_idx" ON "Notification"("status", "availableAt");

-- AddForeignKey
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HealthUnit" ADD CONSTRAINT "unit_response_minutes" CHECK ("responseMinutes" BETWEEN 15 AND 10080);
ALTER TABLE "Notification" ADD CONSTRAINT "notification_status_check" CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED'));
