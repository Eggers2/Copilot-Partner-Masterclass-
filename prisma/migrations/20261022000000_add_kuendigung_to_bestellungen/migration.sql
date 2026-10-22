-- Kündigung je Bestellung (Systemhaus kündigt den Vertrag).
--
-- gekuendigt_am: Eingang der Kündigung (Kalendertag). Ist die Spalte gesetzt,
-- verlängert sich der Vertrag nicht automatisch.
-- kuendigung_zum: Vertragsende, zu dem die Kündigung wirkt (Kalendertag).
-- kuendigung_notiz: Freitext, z.B. Grund oder Kanal der Kündigung.
ALTER TABLE "bestellungen" ADD COLUMN "gekuendigt_am" DATE;
ALTER TABLE "bestellungen" ADD COLUMN "kuendigung_zum" DATE;
ALTER TABLE "bestellungen" ADD COLUMN "kuendigung_notiz" TEXT;
