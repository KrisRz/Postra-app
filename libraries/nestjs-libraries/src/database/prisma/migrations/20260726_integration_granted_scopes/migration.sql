-- First comment needs pages_manage_engagement, which Meta keeps on Standard
-- access: only accounts holding a role in the app are granted it. The same
-- provider is therefore comment-capable on one channel and not on another, so
-- record what each token was actually granted at connect time. Without it the
-- composer can only guess, and a wrong guess means comments written by the user
-- and dropped at publish (see PR #195).
--
-- Additive nullable column, no backfill here: existing rows stay null
-- ("never recorded") and are filled by Plan/scripts/backfill-granted-scopes.js.

ALTER TABLE "Integration" ADD COLUMN "grantedScopes" TEXT;
