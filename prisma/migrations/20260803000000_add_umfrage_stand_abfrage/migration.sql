-- Monatliche Stand-Abfrage (Umfrage-Runden)
-- Runden entstehen am ersten Werktag des Monats je Klasse (sofern seit der
-- letzten Runde mindestens ein Termin durchgeführt wurde). Antworten sind
-- pro Platz und Runde eindeutig (Upsert); anonymes Feedback wird bewusst
-- ohne Personenbezug und ohne Zeitstempel gespeichert.

-- CreateEnum
CREATE TYPE "UmfrageRundeStatus" AS ENUM ('OFFEN', 'ABGESCHLOSSEN');
CREATE TYPE "Jahreszeit" AS ENUM ('NORMAL', 'FERIENFENSTER', 'JAHRESWECHSEL');
CREATE TYPE "TeilnehmerRolle" AS ENUM ('VERTRIEB', 'BERATUNG', 'BEIDES', 'TECHNIK', 'GESCHAEFTSFUEHRUNG', 'WEISS_NICHT');
CREATE TYPE "Groessenklasse" AS ENUM ('UNTER_10', 'VON_10_BIS_50', 'VON_51_BIS_150', 'UEBER_150');
CREATE TYPE "RotierendeAntwort" AS ENUM ('JA', 'NEIN_GEPLANT', 'NEIN', 'NICHT_RELEVANT');
CREATE TYPE "UmfrageKanal" AS ENUM ('EMAIL', 'KLASSE');

-- Felderweiterungen bestehender Tabellen
ALTER TABLE "klassen"
    ADD COLUMN "curriculum_stand" TEXT;

ALTER TABLE "klasse_termine"
    ADD COLUMN "ferien" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "bestellungen"
    ADD COLUMN "intern" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "groessenklasse" "Groessenklasse";

ALTER TABLE "bestellung_teilnehmer"
    ADD COLUMN "rolle" "TeilnehmerRolle";

-- CreateTable: umfrage_runden
CREATE TABLE "umfrage_runden" (
    "id" TEXT NOT NULL,
    "klasse_id" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "status" "UmfrageRundeStatus" NOT NULL DEFAULT 'OFFEN',
    "stichtag" TIMESTAMP(3) NOT NULL,
    "programmtag" INTEGER NOT NULL,
    "jahreszeit" "Jahreszeit" NOT NULL DEFAULT 'NORMAL',
    "rotierender_inhalt" TEXT NOT NULL,
    "versand_am" TIMESTAMP(3),
    "erinnerung_am" TIMESTAMP(3),
    "lieferrisiko_geprueft_am" TIMESTAMP(3),
    "abgeschlossen_am" TIMESTAMP(3),
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "umfrage_runden_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "umfrage_runden_klasse_id_nummer_key" ON "umfrage_runden"("klasse_id", "nummer");
CREATE INDEX "umfrage_runden_status_idx" ON "umfrage_runden"("status");

ALTER TABLE "umfrage_runden" ADD CONSTRAINT "umfrage_runden_klasse_id_fkey" FOREIGN KEY ("klasse_id") REFERENCES "klassen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: umfrage_antworten
CREATE TABLE "umfrage_antworten" (
    "id" TEXT NOT NULL,
    "runde_id" TEXT NOT NULL,
    "teilnehmer_id" INTEGER NOT NULL,
    "vorname" TEXT NOT NULL,
    "nachname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rolle" "TeilnehmerRolle" NOT NULL,
    "stufe" INTEGER,
    "tech_stufe" INTEGER,
    "blocker" INTEGER NOT NULL,
    "blocker_stufe" INTEGER,
    "blocker_suche" TEXT,
    "rotierend" "RotierendeAntwort" NOT NULL,
    "kanal" "UmfrageKanal" NOT NULL DEFAULT 'EMAIL',
    "rueckschritt_gemeldet_am" TIMESTAMP(3),
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "umfrage_antworten_pkey" PRIMARY KEY ("id"),
    -- Genau eine der beiden Leitern ist beantwortet (Roadmap ODER Technik).
    CONSTRAINT "umfrage_antworten_stufe_xor_check" CHECK (
        ("stufe" IS NOT NULL AND "tech_stufe" IS NULL)
        OR ("stufe" IS NULL AND "tech_stufe" IS NOT NULL)
    ),
    CONSTRAINT "umfrage_antworten_stufe_range_check" CHECK ("stufe" IS NULL OR ("stufe" >= 0 AND "stufe" <= 9)),
    CONSTRAINT "umfrage_antworten_tech_stufe_range_check" CHECK ("tech_stufe" IS NULL OR ("tech_stufe" >= 0 AND "tech_stufe" <= 4)),
    CONSTRAINT "umfrage_antworten_blocker_range_check" CHECK ("blocker" >= 1 AND "blocker" <= 8),
    CONSTRAINT "umfrage_antworten_blocker_stufe_range_check" CHECK ("blocker_stufe" IS NULL OR ("blocker_stufe" >= 1 AND "blocker_stufe" <= 9))
);

CREATE UNIQUE INDEX "umfrage_antworten_runde_id_teilnehmer_id_key" ON "umfrage_antworten"("runde_id", "teilnehmer_id");
CREATE INDEX "umfrage_antworten_runde_id_idx" ON "umfrage_antworten"("runde_id");
CREATE INDEX "umfrage_antworten_teilnehmer_id_idx" ON "umfrage_antworten"("teilnehmer_id");

ALTER TABLE "umfrage_antworten" ADD CONSTRAINT "umfrage_antworten_runde_id_fkey" FOREIGN KEY ("runde_id") REFERENCES "umfrage_runden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "umfrage_antworten" ADD CONSTRAINT "umfrage_antworten_teilnehmer_id_fkey" FOREIGN KEY ("teilnehmer_id") REFERENCES "bestellung_teilnehmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: umfrage_anonym_feedback
-- Bewusst ohne Personenbezug und ohne Zeitstempel; UUID statt cuid, weil
-- cuids zeitlich sortierbar sind und damit ein Korrelations-Kanal wären.
CREATE TABLE "umfrage_anonym_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "runde_id" TEXT NOT NULL,
    "klasse_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "umfrage_anonym_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "umfrage_anonym_feedback_runde_id_idx" ON "umfrage_anonym_feedback"("runde_id");

ALTER TABLE "umfrage_anonym_feedback" ADD CONSTRAINT "umfrage_anonym_feedback_runde_id_fkey" FOREIGN KEY ("runde_id") REFERENCES "umfrage_runden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: interne Bestellungen markieren (Firmennamen-Heuristik, im Admin
-- korrigierbar). Interne Plätze dürfen in keiner Auswertung erscheinen.
UPDATE "bestellungen" SET "intern" = true
WHERE "firma" ILIKE '%ke solutions%'
   OR "firma" ILIKE '%secom%'
   OR "firma" ILIKE '%nextvideo%';
