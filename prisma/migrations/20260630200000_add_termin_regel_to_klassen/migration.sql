-- Termin-Regel pro Klasse
-- Hinterlegt, nach welcher Logik Termine automatisch angelegt werden
-- (n-ter Wochentag im Monat + Uhrzeit). Inhalt: JSON-Array von Mustern,
-- z.B. [{"week":1,"weekday":1,"time":"16:00"},{"week":3,"weekday":5,"time":"11:00"}].

ALTER TABLE "klassen"
    ADD COLUMN "termin_regel" JSONB;
