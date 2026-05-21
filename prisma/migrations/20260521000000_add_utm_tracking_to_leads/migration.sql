-- AlterTable
ALTER TABLE "waitlist"
  ADD COLUMN "utm_source"     VARCHAR(100),
  ADD COLUMN "utm_medium"     VARCHAR(100),
  ADD COLUMN "utm_campaign"   VARCHAR(100),
  ADD COLUMN "utm_content"    VARCHAR(100),
  ADD COLUMN "utm_term"       VARCHAR(100),
  ADD COLUMN "referrer"       VARCHAR(500),
  ADD COLUMN "landing_page"   VARCHAR(500),
  ADD COLUMN "first_touch_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "waitlist_utm_source_idx" ON "waitlist"("utm_source");

-- CreateIndex
CREATE INDEX "waitlist_utm_campaign_idx" ON "waitlist"("utm_campaign");
