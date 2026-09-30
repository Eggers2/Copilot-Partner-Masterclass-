-- Kosten, die für einen Lead aus der Kaltakquise bezahlt wurden (in Cent).

-- AlterTable
ALTER TABLE "waitlist" ADD COLUMN "acquisition_cost" INTEGER NOT NULL DEFAULT 0;
