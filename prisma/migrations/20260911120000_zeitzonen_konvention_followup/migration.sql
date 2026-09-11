-- Zeitzonen-Konvention: Lead.followUpAt von naiver Ortszeit auf echtes UTC
-- ========================================================================
--
-- Ausgangslage: `waitlist."followUpAt"` wurde aus dem Admin heraus mit
-- `new Date("2026-09-16T11:30")` geschrieben. Auf Railway laeuft der Prozess in
-- UTC, deshalb landete die Berliner Wanduhrzeit unveraendert als UTC in der
-- Spalte. Die Anzeige gab denselben Wert roh wieder aus, beide Seiten waren fuer
-- sich stimmig. Der MCP-Server rechnet dagegen korrekt nach UTC um, wodurch
-- seine Werte zwei Stunden frueher angezeigt wurden als gemeint.
--
-- Ab jetzt gilt: in der Spalte steht echtes UTC, umgerechnet wird nur noch an
-- den Raendern gegen Europe/Berlin (siehe lib/datetime.ts).
--
-- Diese Migration deutet jeden Altwert als Berliner Wandzeit und rechnet ihn in
-- UTC um. Zusammen mit der umgestellten Anzeige heben sich beide Schritte auf:
-- im Portal steht danach exakt dieselbe Uhrzeit wie vorher.
--
--   ("followUpAt" AT TIME ZONE 'Europe/Berlin')   naive Zeit als Berlin lesen
--   ... AT TIME ZONE 'UTC'                        zurueck in eine naive UTC-Zeit
--
-- PostgreSQL nutzt dafuer die IANA-Zeitzonendatenbank und wendet die zum
-- jeweiligen Datum gueltige Sommerzeitregel an, nicht die von heute. Ein
-- Termin im Januar verschiebt sich um eine Stunde, einer im Juli um zwei.
--
-- Sicherungen und Idempotenz laufen ueber zeitzonen_migration_followup: dort
-- steht je Lead der alte und der neue Wert. Bereits migrierte Zeilen werden
-- uebersprungen, ein zweiter Lauf aendert also nichts mehr.
--
-- Nicht angefasst werden Zeilen, deren Anzeige sich zwangslaeufig aendern
-- wuerde: Werte, deren naive Lesart in die uebersprungene Stunde der
-- Fruehjahrsumstellung faellt (z.B. 29.03.2026 02:30, diese Ortszeit gibt es
-- nicht). Sie bleiben unveraendert und werden von scripts/tz-migrate-followup.ts
-- zur Entscheidung aufgelistet.
--
-- Zuruecknehmen (nur zusammen mit einem Rollback des Deployments):
--   UPDATE "waitlist" w SET "followUpAt" = m.alt_wert
--   FROM zeitzonen_migration_followup m WHERE w.id = m.lead_id;

CREATE TABLE IF NOT EXISTS "zeitzonen_migration_followup" (
    "lead_id"     UUID PRIMARY KEY,
    "alt_wert"    TIMESTAMP(3) NOT NULL,
    "neu_wert"    TIMESTAMP(3) NOT NULL,
    "migriert_am" TIMESTAMP(3) NOT NULL DEFAULT now()
);

WITH kandidaten AS (
    SELECT
        w."id" AS lead_id,
        w."followUpAt" AS alt_wert,
        (w."followUpAt" AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'UTC' AS neu_wert
    FROM "waitlist" w
    WHERE w."followUpAt" IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM "zeitzonen_migration_followup" m WHERE m."lead_id" = w."id"
      )
),
-- Nur Zeilen, bei denen die angezeigte Uhrzeit nachweislich gleich bleibt:
-- der neue UTC-Wert muss in Berlin wieder genau die alte naive Lesart ergeben.
anzeigeneutral AS (
    SELECT * FROM kandidaten
    WHERE to_char(neu_wert AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI:SS.MS')
        = to_char(alt_wert, 'YYYY-MM-DD HH24:MI:SS.MS')
),
protokoll AS (
    INSERT INTO "zeitzonen_migration_followup" ("lead_id", "alt_wert", "neu_wert")
    SELECT lead_id, alt_wert, neu_wert FROM anzeigeneutral
    RETURNING "lead_id", "neu_wert"
)
UPDATE "waitlist" w
SET "followUpAt" = p."neu_wert"
FROM protokoll p
WHERE w."id" = p."lead_id";
