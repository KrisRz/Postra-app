-- Revocable sessions: give every user a monotonically increasing token version.
-- The JWT carries this value and auth.middleware rejects a token whose version
-- no longer matches the row, so a password reset (which bumps it) invalidates
-- all outstanding 30-day tokens.
--
-- Additive column with a NOT NULL default, so boot `prisma db push` applies it
-- without --accept-data-loss (unlike the 2026-07-08 unique-index incident). This
-- file exists for parity with the versioned-migration convention; db push sees
-- the desired state already satisfied once the column exists and does nothing.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
