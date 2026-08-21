-- Videokurs-Tracking wieder entfernt: die Fortschritts-Daten aus dem
-- ablefy-Export waren nicht verlässlich, deshalb wird der Videokurs nicht
-- mehr getrackt (Upload, Auswertung und Erinnerungs-Text sind ausgebaut).

-- DropTable: kurs_fortschritte (samt Unique-Index auf email)
DROP TABLE IF EXISTS "kurs_fortschritte";

-- Import-Metadaten des Exports (Dateiname, Zeitpunkt, Anzahl) aufräumen
DELETE FROM "app_settings" WHERE "key" = 'kurs_fortschritt_import';
