-- Re-introduce uniqueness on UsedCodes.code (double-redeem race guard for
-- lifetime codes). MUST be applied out-of-band BEFORE the matching schema
-- change (code @unique) is deployed — see this migration's PR body for the
-- runbook and why. Boot runs `prisma db push` without --accept-data-loss, so
-- it refuses to *add* a unique constraint (flagged as data-loss) and the app
-- never starts (prod 502, 2026-07-08). Once this index physically exists and
-- the data is clean, db push sees the desired state already satisfied and does
-- nothing.
--
-- The index is named "UsedCodes_code_key" — Prisma's default name for
-- @unique on UsedCodes.code — so `db push` treats it as an exact match.

-- 1) Dedupe: keep the earliest row per code, delete the rest. Pre-revenue this
--    should be a no-op (0 duplicates); verify with the SELECT in the PR body.
DELETE FROM "UsedCodes" a
USING "UsedCodes" b
WHERE a.code = b.code
  AND (a."createdAt" > b."createdAt"
       OR (a."createdAt" = b."createdAt" AND a.id > b.id));

-- 2) Enforce uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS "UsedCodes_code_key" ON "UsedCodes"("code");

-- 3) Drop the now-redundant non-unique index the schema no longer declares
--    (the unique index above already serves getCode lookups). Harmless if it
--    was already removed; db push would otherwise drop it on next boot.
DROP INDEX IF EXISTS "UsedCodes_code_idx";
