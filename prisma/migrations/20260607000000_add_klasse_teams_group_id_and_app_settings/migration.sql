-- Pro-Klasse-Teams-Routing + generischer App-Settings-Store (Schalter native/n8n)

-- Group-ID (= Teams-Team-ID) pro Klasse
ALTER TABLE "klassen" ADD COLUMN "teams_group_id" TEXT;

-- Backfill: Klasse 1 nutzt weiterhin das bisher fest verdrahtete Team, damit der
-- Native-Modus für bestehende Teilnehmer dasselbe Ziel wie der n8n-Workflow hat.
UPDATE "klassen" SET "teams_group_id" = '81beeeb8-3ef1-4715-98bd-dbcd7b823dd9' WHERE "slug" = 'klasse-1';

-- Generischer Key/Value-Store für App-weite Laufzeit-Schalter
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);
