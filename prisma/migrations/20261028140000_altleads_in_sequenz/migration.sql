-- Zwei Leads aus dem alten n8n-Ablauf ("Masterclass – Follow-up Sequenz")
-- steigen dort in die neue Sequenz (lib/followup) ein, wo sie aufgehört
-- haben, damit keine Mail doppelt kommt:
--   adrian.gerling@hosysteme.de  hatte FOLLOWUP_1  → weiter mit Mail 2
--   a.schmalberger@feha.de       hatte FOLLOWUP_2  → weiter mit Mail 3
-- Erste Mail am 29.10.2026 ab 08:00 Berlin (07:00 UTC). sequenz_start_am ist
-- so zurückgerechnet, dass danach der normale Takt (Tag 9, 14, Ende Tag 19)
-- gilt. Greift nur, solange der Lead noch CONTACTED ist und keine Sequenz hat.
WITH uebernahme(id, schritt, start_am, naechste_am, mail) AS (
  VALUES
    ('4fe50b4d-3d72-43e8-9776-780b7f2c64b8'::uuid, 1, TIMESTAMP '2026-10-24 07:00:00', TIMESTAMP '2026-10-29 07:00:00', 2),
    ('8edc4b28-4e2b-4723-9709-134e0be3b318'::uuid, 2, TIMESTAMP '2026-10-20 07:00:00', TIMESTAMP '2026-10-29 07:00:00', 3)
),
aktualisiert AS (
  UPDATE "waitlist" w
  SET "sequenz_start_am" = u.start_am,
      "sequenz_schritt" = u.schritt,
      "sequenz_naechste_am" = u.naechste_am,
      "updatedAt" = NOW()
  FROM uebernahme u
  WHERE w."id" = u.id
    AND w."status" = 'CONTACTED'
    AND w."sequenz_naechste_am" IS NULL
    AND w."sequenz_stopp" IS NULL
  RETURNING w."id", u.mail
)
INSERT INTO "lead_activities" ("id", "leadId", "type", "content", "createdAt")
SELECT gen_random_uuid(), a."id", 'NOTE',
       'Aus der alten n8n-Sequenz übernommen: weiter mit Follow-up-Mail ' || a.mail || ' von 4',
       NOW()
FROM aktualisiert a;
