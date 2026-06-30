-- Termine & Themen pro Klasse
-- Hält pro Klasse fest, welches Thema an welchem Termin behandelt wurde bzw.
-- geplant ist (typ. zwei Termine pro Monat). Getrennt vom Webinar-Modul.

-- CreateEnum: TerminStatus
CREATE TYPE "TerminStatus" AS ENUM ('GEPLANT', 'DURCHGEFUEHRT');

-- CreateTable: klasse_termine
CREATE TABLE "klasse_termine" (
    "id" TEXT NOT NULL,
    "klasse_id" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "thema" TEXT,
    "notizen" TEXT,
    "status" "TerminStatus" NOT NULL DEFAULT 'GEPLANT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "klasse_termine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: lookup by klasse
CREATE INDEX "klasse_termine_klasse_id_idx" ON "klasse_termine"("klasse_id");

-- AddForeignKey: klasse_termine -> klassen
ALTER TABLE "klasse_termine" ADD CONSTRAINT "klasse_termine_klasse_id_fkey" FOREIGN KEY ("klasse_id") REFERENCES "klassen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
