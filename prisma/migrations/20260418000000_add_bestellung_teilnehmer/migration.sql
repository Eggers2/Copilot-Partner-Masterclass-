-- CreateTable
CREATE TABLE "bestellung_teilnehmer" (
    "id" SERIAL NOT NULL,
    "bestellung_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "vorname" TEXT NOT NULL DEFAULT '',
    "nachname" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bestellung_teilnehmer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bestellung_teilnehmer_bestellung_id_idx" ON "bestellung_teilnehmer"("bestellung_id");

-- CreateIndex
CREATE UNIQUE INDEX "bestellung_teilnehmer_bestellung_id_position_key" ON "bestellung_teilnehmer"("bestellung_id", "position");

-- AddForeignKey
ALTER TABLE "bestellung_teilnehmer" ADD CONSTRAINT "bestellung_teilnehmer_bestellung_id_fkey" FOREIGN KEY ("bestellung_id") REFERENCES "bestellungen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
