-- Events (Connect Day) + Anmeldungen mit sevDesk-Rechnungsstatus
-- Reihenfolge:
--   1. Enums anlegen
--   2. events-Tabelle anlegen + Connect Day 2026 seeden
--   3. event_registrations + event_teilnehmer anlegen
--   4. Partieller Unique-Index gegen Doppelanmeldung (nur CONFIRMED)
--   5. bestellungen um sevDesk-Kontakt-Cache erweitern

-- 1. Enums
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');
CREATE TYPE "EventRegistrationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');
CREATE TYPE "EventInvoiceStatus" AS ENUM ('PENDING', 'CREATED', 'SENT', 'FAILED');

-- 2. events-Tabelle
CREATE TABLE "events" (
    "id"                     TEXT           NOT NULL,
    "slug"                   TEXT           NOT NULL,
    "name"                   TEXT           NOT NULL,
    "ort"                    TEXT,
    "start_at"               TIMESTAMP(3)   NOT NULL,
    "end_at"                 TIMESTAMP(3)   NOT NULL,
    "anmeldeschluss"         TIMESTAMP(3)   NOT NULL,
    "capacity"               INTEGER        NOT NULL DEFAULT 100,
    "seats_taken"            INTEGER        NOT NULL DEFAULT 0,
    "max_pro_bestellung"     INTEGER        NOT NULL DEFAULT 3,
    "preis_netto_pro_person" DECIMAL(10, 2) NOT NULL,
    "status"                 "EventStatus"  NOT NULL DEFAULT 'DRAFT',
    "erlaubte_klassen_slugs" TEXT[],
    "beschreibung"           TEXT,
    "erstellt_am"            TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiert_am"        TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- Seed: Copilot Connect Day 2026 (Zeiten in UTC; 12:00/14:00 Berlin = CET/UTC+1;
-- Anmeldeschluss 17.07.2026 23:59 Berlin = CEST/UTC+2)
INSERT INTO "events" (
    "id", "slug", "name", "ort", "start_at", "end_at", "anmeldeschluss",
    "capacity", "seats_taken", "max_pro_bestellung", "preis_netto_pro_person",
    "status", "erlaubte_klassen_slugs", "beschreibung", "erstellt_am", "aktualisiert_am"
) VALUES (
    'connect-day-2026-seed-id',
    'connect-day-2026',
    'Copilot Connect Day 2026',
    'nhow Hotel Frankfurt am Main',
    '2026-12-10 11:00:00',
    '2026-12-11 13:00:00',
    '2026-07-17 21:59:59',
    100, 0, 3, 199.00,
    'OPEN',
    ARRAY['klasse-1', 'klasse-2'],
    'Connect Day der Copilot Partner Masterclass mit Klasse 1 und 2. Donnerstag 12 Uhr bis Freitag 14 Uhr. 4 MVPs vor Ort: Tanja Wiehoff (Copilot Studio / Agenten), Raphael Köllner (Compliance / Datenschutz), Michael Greth (Copilot / SharePoint), Alex Eggers (Copilot / Adoption). ADN als Distributor und Sponsor vor Ort. Im Eigenanteil enthalten: Hotelübernachtung im nhow Hotel Frankfurt, Mittagssnack Do/Fr, Kaffeepause Do/Fr, Abendessen, 2 Stunden in der höchsten Skybar Deutschlands mit freiem Bier/Wein/Softdrinks.',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 3a. event_registrations
CREATE TABLE "event_registrations" (
    "id"                 TEXT                      NOT NULL,
    "event_id"           TEXT                      NOT NULL,
    "bestellung_id"      INTEGER                   NOT NULL,
    "status"             "EventRegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "personen"           INTEGER                   NOT NULL,
    "preis_netto"        DECIMAL(10, 2)            NOT NULL,
    "mwst_satz"          DECIMAL(4, 2)             NOT NULL,
    "mwst_betrag"        DECIMAL(10, 2)            NOT NULL,
    "preis_brutto"       DECIMAL(10, 2)            NOT NULL,
    "reverse_charge"     BOOLEAN                   NOT NULL DEFAULT false,
    "invoice_status"     "EventInvoiceStatus"      NOT NULL DEFAULT 'PENDING',
    "sevdesk_contact_id" TEXT,
    "sevdesk_invoice_id" TEXT,
    "sevdesk_invoice_nr" TEXT,
    "invoice_error"      TEXT,
    "invoice_sent_at"    TIMESTAMP(3),
    "angemeldet_von"     TEXT                      NOT NULL,
    "storno_am"          TIMESTAMP(3),
    "storno_notiz"       TEXT,
    "erstellt_am"        TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiert_am"    TIMESTAMP(3)              NOT NULL,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_registrations_event_id_idx" ON "event_registrations"("event_id");
CREATE INDEX "event_registrations_bestellung_id_idx" ON "event_registrations"("bestellung_id");

ALTER TABLE "event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "event_registrations"
    ADD CONSTRAINT "event_registrations_bestellung_id_fkey"
    FOREIGN KEY ("bestellung_id") REFERENCES "bestellungen"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3b. event_teilnehmer
CREATE TABLE "event_teilnehmer" (
    "id"                       TEXT         NOT NULL,
    "registration_id"          TEXT         NOT NULL,
    "position"                 INTEGER      NOT NULL,
    "bestellung_teilnehmer_id" INTEGER      NOT NULL,
    "vorname"                  TEXT         NOT NULL,
    "nachname"                 TEXT         NOT NULL,
    "email"                    TEXT         NOT NULL,
    "hinweise"                 TEXT,
    "erstellt_am"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiert_am"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_teilnehmer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_teilnehmer_registration_id_position_key"
    ON "event_teilnehmer"("registration_id", "position");
CREATE UNIQUE INDEX "event_teilnehmer_registration_id_bestellung_teilnehmer_id_key"
    ON "event_teilnehmer"("registration_id", "bestellung_teilnehmer_id");

ALTER TABLE "event_teilnehmer"
    ADD CONSTRAINT "event_teilnehmer_registration_id_fkey"
    FOREIGN KEY ("registration_id") REFERENCES "event_registrations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_teilnehmer"
    ADD CONSTRAINT "event_teilnehmer_bestellung_teilnehmer_id_fkey"
    FOREIGN KEY ("bestellung_teilnehmer_id") REFERENCES "bestellung_teilnehmer"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Partieller Unique-Index: pro Event und Bestellung höchstens EINE
--    bestätigte Anmeldung. Stornierte Zeilen bleiben als Audit-Historie
--    stehen und blockieren eine erneute Anmeldung nicht.
--    (Nicht im Prisma-Schema deklarierbar → hier per Hand.)
CREATE UNIQUE INDEX "event_registrations_confirmed_unique"
    ON "event_registrations"("event_id", "bestellung_id")
    WHERE "status" = 'CONFIRMED';

-- 5. bestellungen: sevDesk-Kontakt-Cache
ALTER TABLE "bestellungen"
    ADD COLUMN "sevdesk_contact_id" TEXT;
