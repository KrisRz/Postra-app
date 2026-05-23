-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailNormalized" TEXT;

-- CreateIndex (unique per provider, nullable safe)
CREATE UNIQUE INDEX "User_emailNormalized_providerName_key" ON "User"("emailNormalized", "providerName");
