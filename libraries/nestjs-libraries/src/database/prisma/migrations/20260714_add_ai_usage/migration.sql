-- Observational text-AI usage metering: tokens (LLM) or seconds (Whisper) per
-- organization and engine. Purely additive (new table, no constraints touching
-- existing data), so boot `prisma db push` applies it without
-- --accept-data-loss and `migrate deploy` (PR #159) baselines it cleanly.
-- NOT billing: credit limits keep living in "Credits" untouched.

CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "engine" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'tokens',
    "inputAmount" INTEGER NOT NULL DEFAULT 0,
    "outputAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsage_organizationId_createdAt_idx" ON "AiUsage"("organizationId", "createdAt");

CREATE INDEX "AiUsage_engine_createdAt_idx" ON "AiUsage"("engine", "createdAt");
