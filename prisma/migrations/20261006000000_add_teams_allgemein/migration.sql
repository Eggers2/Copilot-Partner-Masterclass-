-- Aufnahme ins klassenübergreifende allgemeine Teams-Team, zusätzlich zum Klassen-Team.

-- AlterTable
ALTER TABLE "bestellung_teilnehmer" ADD COLUMN "teams_allgemein_eingeladen_am" TIMESTAMP(3);
