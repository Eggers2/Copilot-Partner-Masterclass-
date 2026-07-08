-- Anwesenheitsberichte (MS Teams) pro Termin
-- Pro Termin kann der Teams-Anwesenheitsbericht (CSV-Export) hochgeladen
-- werden. Die Metadaten (Dateiname, Importzeitpunkt) liegen am Termin, die
-- einzelnen Teilnehmer-Zeilen in termin_anwesenheiten. Der Abgleich mit den
-- im Shop gemeldeten Teilnehmern passiert zur Lesezeit über die E-Mail.

ALTER TABLE "klasse_termine"
    ADD COLUMN "anwesenheit_dateiname" TEXT,
    ADD COLUMN "anwesenheit_importiert_am" TIMESTAMP(3);

-- CreateTable: termin_anwesenheiten
CREATE TABLE "termin_anwesenheiten" (
    "id" TEXT NOT NULL,
    "termin_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "rolle" TEXT,
    "dauer_sekunden" INTEGER NOT NULL DEFAULT 0,
    "erster_beitritt" TIMESTAMP(3),
    "letztes_verlassen" TIMESTAMP(3),
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "termin_anwesenheiten_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: lookup by termin
CREATE INDEX "termin_anwesenheiten_termin_id_idx" ON "termin_anwesenheiten"("termin_id");

-- AddForeignKey: termin_anwesenheiten -> klasse_termine
ALTER TABLE "termin_anwesenheiten" ADD CONSTRAINT "termin_anwesenheiten_termin_id_fkey" FOREIGN KEY ("termin_id") REFERENCES "klasse_termine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
