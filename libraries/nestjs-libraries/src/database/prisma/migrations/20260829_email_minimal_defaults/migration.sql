-- Send only mail the user has to act on.
--
-- "Streak Reminder" put an artificial two-hour deadline on a vanity metric and
-- was opt-out, so every new account got it. The streak itself stays, shown by
-- StreakComponent in the top bar; only the email is gone, so the preference
-- backing it has nothing left to switch.
--
-- Success mail is now opt-in as well: an agency publishing 30 posts a day got
-- a mail per successful publish, and mail nobody wanted is what earns spam
-- complaints. Sender reputation is shared across the domain, so those
-- complaints land on account activation and password resets - the mail that
-- has to arrive. Failure mail stays opt-out: it is the one that needs a human.
--
-- Existing rows are flipped too. Nobody chose true; it was only ever the
-- default, and pre-launch that is our own test accounts.

ALTER TABLE "User" DROP COLUMN "sendStreakEmails";

ALTER TABLE "User" ALTER COLUMN "sendSuccessEmails" SET DEFAULT false;

UPDATE "User" SET "sendSuccessEmails" = false;
