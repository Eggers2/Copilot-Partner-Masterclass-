-- AlterTable
ALTER TABLE "bestellungen" ADD COLUMN IF NOT EXISTS "show_on_map" BOOLEAN NOT NULL DEFAULT true;
