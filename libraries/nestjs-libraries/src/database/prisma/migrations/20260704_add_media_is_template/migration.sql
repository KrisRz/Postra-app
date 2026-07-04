-- "Save as my template": a Media row with canvasJson can be flagged as a
-- reusable per-organization template (shown in Studio's Templates panel).
ALTER TABLE "Media" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Media_organizationId_isTemplate_idx" ON "Media"("organizationId", "isTemplate");
