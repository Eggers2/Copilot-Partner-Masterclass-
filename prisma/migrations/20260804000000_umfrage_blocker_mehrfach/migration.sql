-- Blocker-Frage der Stand-Abfrage: Mehrfachauswahl statt Einfachauswahl.
-- Jemand kann mehrere Bremsen gleichzeitig haben; bestehende Einzelwerte
-- werden in ein Array mit einem Element überführt.

ALTER TABLE "umfrage_antworten"
    DROP CONSTRAINT IF EXISTS "umfrage_antworten_blocker_range_check";

ALTER TABLE "umfrage_antworten"
    ALTER COLUMN "blocker" TYPE INTEGER[] USING ARRAY["blocker"];

ALTER TABLE "umfrage_antworten"
    ADD CONSTRAINT "umfrage_antworten_blocker_check"
    CHECK (cardinality("blocker") >= 1 AND "blocker" <@ ARRAY[1, 2, 3, 4, 5, 6, 7, 8]);
