-- Connect Day: Warteliste + Wiedereröffnung.
--
-- Hintergrund: Die reguläre Anmeldung ist geschlossen bzw. der Anmeldeschluss
-- ist abgelaufen, es sind aber noch Plätze frei. Der Betreiber öffnet die
-- FCFS-Anmeldung im Admin wieder (Status + neuer Anmeldeschluss – bestehende
-- Spalten, keine Schemaänderung nötig) und führt eine Warteliste ein.
--
-- Die Warteliste wird im Kundenportal befüllt, sobald das Event ausgebucht
-- ist. Das Nachrücken passiert manuell im Admin (kein Auto-Versand).

-- 1. Enum für den Wartelisten-Status
CREATE TYPE "EventWaitlistStatus" AS ENUM ('WAITING', 'PROMOTED', 'CANCELLED');

-- 2. event_waitlist-Tabelle
CREATE TABLE "event_waitlist" (
    "id"              TEXT                  NOT NULL,
    "event_id"        TEXT                  NOT NULL,
    "bestellung_id"   INTEGER               NOT NULL,
    "angemeldet_von"  TEXT                  NOT NULL,
    "kontakt_name"    TEXT                  NOT NULL,
    "kontakt_email"   TEXT                  NOT NULL,
    "personen"        INTEGER               NOT NULL DEFAULT 1,
    "notiz"           TEXT,
    "status"          "EventWaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "promoted_am"     TIMESTAMP(3),
    "erstellt_am"     TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiert_am" TIMESTAMP(3)          NOT NULL,

    CONSTRAINT "event_waitlist_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_waitlist_event_id_status_idx" ON "event_waitlist"("event_id", "status");
CREATE INDEX "event_waitlist_bestellung_id_idx" ON "event_waitlist"("bestellung_id");

ALTER TABLE "event_waitlist"
    ADD CONSTRAINT "event_waitlist_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "event_waitlist"
    ADD CONSTRAINT "event_waitlist_bestellung_id_fkey"
    FOREIGN KEY ("bestellung_id") REFERENCES "bestellungen"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Partieller Unique-Index: pro Event und Bestellung höchstens EIN aktiver
--    (WAITING) Wartelisten-Eintrag. Ausgetragene/nachgerückte Einträge bleiben
--    als Historie stehen und blockieren einen erneuten Eintrag nicht.
CREATE UNIQUE INDEX "event_waitlist_waiting_unique"
    ON "event_waitlist"("event_id", "bestellung_id")
    WHERE "status" = 'WAITING';
