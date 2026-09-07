-- AlterTable
ALTER TABLE "User" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "guestExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_isGuest_guestExpiresAt_idx" ON "User"("isGuest", "guestExpiresAt");
