-- Compliance Faza 0 (Plan/complience.md C2 + C10):
-- 1. User.termsAcceptedAt — records the explicit ToS/Privacy acceptance at
--    registration (UK GDPR accountability). Nullable, purely additive.
-- 2. MobilePushToken gains FK cascades so account erasure removes push tokens.
--    Orphans from deletions that happened before the FKs existed must go first,
--    otherwise ADD CONSTRAINT fails on prod.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- Clean up orphaned push tokens before adding the constraints
DELETE FROM "MobilePushToken" m
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = m."userId")
   OR NOT EXISTS (SELECT 1 FROM "Organization" o WHERE o."id" = m."organizationId");

-- AddForeignKey
ALTER TABLE "MobilePushToken" ADD CONSTRAINT "MobilePushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilePushToken" ADD CONSTRAINT "MobilePushToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
