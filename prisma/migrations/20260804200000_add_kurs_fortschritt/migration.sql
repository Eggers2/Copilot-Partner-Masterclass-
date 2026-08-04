-- Videokurs-Fortschritt (ablefy-Export "export course_sessions")
-- Globaler Datenstand für alle Klassen: eine Zeile je E-Mail mit dem Anteil
-- gesehener Videos in Prozent (0-100). Ein erneuter Upload ersetzt den Stand
-- komplett; die Import-Metadaten (Dateiname, Zeitpunkt, Anzahl) liegen als
-- AppSetting. Der Abgleich mit den im Shop gemeldeten Teilnehmern passiert
-- zur Lesezeit über E-Mail/Name (lib/db/anwesenheit.ts).

-- CreateTable: kurs_fortschritte
CREATE TABLE "kurs_fortschritte" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fortschritt" INTEGER NOT NULL DEFAULT 0,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kurs_fortschritte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: eine Zeile je E-Mail
CREATE UNIQUE INDEX "kurs_fortschritte_email_key" ON "kurs_fortschritte"("email");
