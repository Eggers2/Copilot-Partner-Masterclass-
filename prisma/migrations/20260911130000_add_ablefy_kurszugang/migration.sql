-- Ablefy-Kurszugang je Teilnehmerplatz.
-- Beim Speichern der Teilnehmerliste wird jede eingetragene E-Mail als
-- kostenlose Ablefy-Bestellung auf den Kurs gebucht (siehe lib/ablefy).

-- CreateEnum
CREATE TYPE "AblefyState" AS ENUM ('OFFEN', 'IN_ARBEIT', 'PROVISIONIERT', 'FEHLER', 'STORNIERT');

-- AlterTable
ALTER TABLE "bestellung_teilnehmer"
  ADD COLUMN "ablefy_state" "AblefyState" NOT NULL DEFAULT 'OFFEN',
  ADD COLUMN "ablefy_order_id" TEXT,
  ADD COLUMN "ablefy_order_token" TEXT,
  ADD COLUMN "ablefy_email" TEXT,
  ADD COLUMN "ablefy_eingebucht_am" TIMESTAMP(3),
  ADD COLUMN "ablefy_versuch_am" TIMESTAMP(3),
  ADD COLUMN "ablefy_fehler" TEXT;

-- Ablefy hat keine Idempotenz: ein zweiter POST auf /api/orders erzeugt eine
-- zweite Bestellung. Der Unique-Index ist die letzte Schicht dagegen.
CREATE UNIQUE INDEX "bestellung_teilnehmer_ablefy_order_id_key"
  ON "bestellung_teilnehmer" ("ablefy_order_id");
