-- Webhook idempotency: Stripe retries deliveries for up to 3 days, so a handler
-- must not run twice for the same event id. Additive table + index; safe under
-- both boot paths (migrate deploy, and `db push` if this lands before #159).
CREATE TABLE IF NOT EXISTS "StripeProcessedEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeProcessedEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StripeProcessedEvent_createdAt_idx" ON "StripeProcessedEvent"("createdAt");
