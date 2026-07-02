-- Connect Day: Anmeldestart (Freischaltung ab 07.07.2026 00:00 Berlin) mit
-- manuellem Admin-Override (Testmodus) + Bezahlt-Tracking pro Anmeldung.

ALTER TABLE "events"
    ADD COLUMN "anmeldestart"           TIMESTAMP(3),
    ADD COLUMN "manuell_freigeschaltet" BOOLEAN NOT NULL DEFAULT false;

-- 07.07.2026 00:00 Berlin (CEST/UTC+2) = 06.07.2026 22:00 UTC
UPDATE "events"
SET "anmeldestart" = '2026-07-06 22:00:00'
WHERE "slug" = 'connect-day-2026';

ALTER TABLE "event_registrations"
    ADD COLUMN "bezahlt_am" TIMESTAMP(3);
