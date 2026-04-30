-- ADN-Vertriebskanal + Klassen-Kohorten
-- Reihenfolge:
--   1. Enums anlegen
--   2. klassen-Tabelle anlegen + Klasse 1 / Klasse 2 seeden
--   3. Spalten auf waitlist (Lead), bestellungen, webinars hinzufügen
--   4. Bestehende bestellungen → Klasse 1 (Backfill)
--   5. Pflicht-FK auf bestellungen.klasse_id

-- 1. Enums
CREATE TYPE "AdnChannel" AS ENUM ('NONE', 'ADN_50', 'ADN_15');
CREATE TYPE "KlasseStatus" AS ENUM ('PLANNED', 'OPEN', 'CLOSED', 'RUNNING', 'COMPLETED');

-- 2. klassen-Tabelle
CREATE TABLE "klassen" (
    "id"           TEXT             NOT NULL,
    "name"         TEXT             NOT NULL,
    "slug"         TEXT             NOT NULL,
    "kickoff_date" TIMESTAMP(3)     NOT NULL,
    "start_date"   TIMESTAMP(3)     NOT NULL,
    "end_date"     TIMESTAMP(3)     NOT NULL,
    "capacity"     INTEGER,
    "status"       "KlasseStatus"   NOT NULL DEFAULT 'PLANNED',
    "description"  TEXT,
    "created_at"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "klassen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "klassen_slug_key" ON "klassen"("slug");

-- Seed: Klasse 1 (läuft) und Klasse 2 (in Planung)
INSERT INTO "klassen" ("id", "name", "slug", "kickoff_date", "start_date", "end_date", "capacity", "status", "description", "created_at", "updated_at")
VALUES
    ('klasse-1-seed-id', 'Klasse 1', 'klasse-1', '2026-05-22 09:00:00', '2026-06-01 00:00:00', '2027-05-31 23:59:59', NULL, 'OPEN', 'Erste Kohorte der Microsoft Copilot Partner Masterclass. Kickoff am 22.05.2026.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('klasse-2-seed-id', 'Klasse 2', 'klasse-2', '2027-05-22 09:00:00', '2027-06-01 00:00:00', '2028-05-31 23:59:59', NULL, 'PLANNED', 'Zweite Kohorte – Termine vorläufig, bitte im Admin pflegen.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3a. waitlist (Lead) erweitern
ALTER TABLE "waitlist"
    ADD COLUMN "adn_channel" "AdnChannel" NOT NULL DEFAULT 'NONE',
    ADD COLUMN "klasse_id"   TEXT;

ALTER TABLE "waitlist"
    ADD CONSTRAINT "waitlist_klasse_id_fkey"
    FOREIGN KEY ("klasse_id") REFERENCES "klassen"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 3b. bestellungen erweitern (klasse_id zunächst NULLABLE für Backfill)
ALTER TABLE "bestellungen"
    ADD COLUMN "list_preis_netto" DECIMAL(10, 2),
    ADD COLUMN "adn_channel"      "AdnChannel" NOT NULL DEFAULT 'NONE',
    ADD COLUMN "klasse_id"        TEXT;

-- 3c. webinars erweitern
ALTER TABLE "webinars"
    ADD COLUMN "klasse_id" TEXT;

ALTER TABLE "webinars"
    ADD CONSTRAINT "webinars_klasse_id_fkey"
    FOREIGN KEY ("klasse_id") REFERENCES "klassen"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Backfill: bestehende Bestellungen → Klasse 1; list_preis_netto = preis_netto (Direktbestellungen ohne ADN)
UPDATE "bestellungen"
SET "klasse_id"        = 'klasse-1-seed-id',
    "list_preis_netto" = "preis_netto"
WHERE "klasse_id" IS NULL;

-- Bestehende WON-Leads ebenfalls Klasse 1 zuordnen, damit alle "Gewonnenen" der laufenden Kohorte zugewiesen sind
UPDATE "waitlist"
SET "klasse_id" = 'klasse-1-seed-id'
WHERE "status" = 'WON' AND "klasse_id" IS NULL;

-- 5. bestellungen.klasse_id auf NOT NULL und FK
ALTER TABLE "bestellungen"
    ALTER COLUMN "klasse_id" SET NOT NULL;

ALTER TABLE "bestellungen"
    ADD CONSTRAINT "bestellungen_klasse_id_fkey"
    FOREIGN KEY ("klasse_id") REFERENCES "klassen"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
