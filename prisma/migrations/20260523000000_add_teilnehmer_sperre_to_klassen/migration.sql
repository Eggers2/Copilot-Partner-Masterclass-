-- Teilnehmer-Sperre pro Klasse
-- Separater Boolean-Schalter (unabhängig vom Status), der das nachträgliche
-- Ändern/Hinzufügen von Teilnehmern im Kundenportal blockiert.
-- Default: false (offen). Klasse 1 läuft bereits → initial gesperrt.

ALTER TABLE "klassen"
    ADD COLUMN "teilnehmer_sperre" BOOLEAN NOT NULL DEFAULT false;

UPDATE "klassen"
SET "teilnehmer_sperre" = true
WHERE "slug" = 'klasse-1';
