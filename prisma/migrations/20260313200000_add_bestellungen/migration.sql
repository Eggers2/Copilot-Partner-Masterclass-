-- CreateTable
CREATE TABLE "bestellungen" (
    "id" SERIAL NOT NULL,
    "bestell_nr" VARCHAR(20) NOT NULL,
    "paket" TEXT NOT NULL,
    "user_anzahl" INTEGER NOT NULL,
    "zahlungsmodell" TEXT NOT NULL,
    "preis_netto" DECIMAL(10,2) NOT NULL,
    "mwst_satz" DECIMAL(4,2) NOT NULL,
    "mwst_betrag" DECIMAL(10,2) NOT NULL,
    "reverse_charge" BOOLEAN NOT NULL DEFAULT false,
    "reverse_charge_hinweis" TEXT,
    "preis_brutto" DECIMAL(10,2) NOT NULL,
    "firma" TEXT NOT NULL,
    "strasse" TEXT NOT NULL,
    "plz" TEXT NOT NULL,
    "ort" TEXT NOT NULL,
    "land" TEXT NOT NULL DEFAULT 'DE',
    "ust_id" TEXT,
    "vorname" TEXT NOT NULL,
    "nachname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefon" TEXT,
    "position" TEXT,
    "anmerkungen" TEXT,
    "status" TEXT NOT NULL DEFAULT 'neu',
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bestellungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bestellungen_bestell_nr_key" ON "bestellungen"("bestell_nr");
