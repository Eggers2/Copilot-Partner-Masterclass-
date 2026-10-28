-- Feld "Keine E-Mails" am Lead: zeigt deutlich, dass jemand keine Mails mehr
-- bekommen will oder nie eingewilligt hat. Sperrt die automatischen
-- Wartelisten-Mails und wird im Admin und im CRM-Werkzeug angezeigt.
ALTER TABLE "waitlist"
  ADD COLUMN "keine_mails_am" TIMESTAMP(3),
  ADD COLUMN "keine_mails_grund" TEXT;

-- Bestehende Abmeldungen per Link aus der Wartelisten-Sequenz übernehmen.
UPDATE "waitlist"
SET "keine_mails_am" = "updatedAt",
    "keine_mails_grund" = 'Abmeldelink Wartelisten-Mails'
WHERE "sequenz_stopp" = 'abgemeldet'
  AND "keine_mails_am" IS NULL;

-- Bestehende Newsletter-Abmeldungen übernehmen (gleiche E-Mail-Adresse).
UPDATE "waitlist" w
SET "keine_mails_am" = n."erstellt_am",
    "keine_mails_grund" = 'Newsletter-Abmeldung'
FROM "newsletter_abmeldungen" n
WHERE lower(w."email") = lower(n."email")
  AND w."keine_mails_am" IS NULL;

-- ADN Schweiz (Folien-Download /adn-schweiz, 28.10.2026): Leads ohne
-- Marketing-Einwilligung. Laufende Sequenzen gibt es bei ihnen nicht.
UPDATE "waitlist"
SET "keine_mails_am" = "createdAt",
    "keine_mails_grund" = 'Keine Marketing-Einwilligung (ADN Schweiz, 28.10.2026)'
WHERE "source" = 'EVENT'
  AND "landing_page" = '/adn-schweiz'
  AND "notes" LIKE '%Marketing-Einwilligung: nein%'
  AND "keine_mails_am" IS NULL;

-- Gesperrte Leads beenden eine eventuell noch laufende Sequenz.
UPDATE "waitlist"
SET "sequenz_naechste_am" = NULL,
    "sequenz_stopp" = COALESCE("sequenz_stopp", 'keine_mails')
WHERE "keine_mails_am" IS NOT NULL
  AND "sequenz_naechste_am" IS NOT NULL;

-- Nachvollziehbarkeit in der Lead-Timeline.
INSERT INTO "lead_activities" ("id", "leadId", "type", "content", "createdAt")
SELECT gen_random_uuid(), "id", 'NOTE', 'Keine E-Mails: ' || "keine_mails_grund", NOW()
FROM "waitlist"
WHERE "keine_mails_am" IS NOT NULL;
