-- Automatische Follow-up-Sequenz nach dem Wartelisten-Eintrag (lib/followup).
-- Ersetzt die n8n-Workflows "EMail Masterclass" und "Follow-up Sequenz".
ALTER TABLE "waitlist"
  ADD COLUMN "sequenz_start_am" TIMESTAMP(3),
  ADD COLUMN "sequenz_schritt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sequenz_naechste_am" TIMESTAMP(3),
  ADD COLUMN "sequenz_stopp" TEXT;

CREATE INDEX "waitlist_sequenz_naechste_am_idx" ON "waitlist"("sequenz_naechste_am");
