-- Einmalige Datenkorrektur: Die 11 ADN-Schweiz-Leads (Folien-Download
-- /adn-schweiz, 28.10.2026) mit Marketing-Einwilligung kommen in die
-- Wartelisten-Sequenz, wie sie /api/waitlist beim Eintrag startet:
-- Start = Eintrag, erste Follow-up-Mail zwei Tage danach. Die Bestätigung
-- haben sie beim Eintrag schon bekommen.
--
-- Doppelte Absicherung: ausdrückliche Adressliste UND "Marketing-
-- Einwilligung: ja" in der Notiz. Leads ohne Einwilligung bleiben
-- ausgeschlossen, ebenso Leads, die schon eine Sequenz haben oder nicht
-- mehr im Status NEW oder CONTACTED sind.
UPDATE "waitlist"
SET "sequenz_start_am" = "createdAt",
    "sequenz_schritt" = 0,
    "sequenz_naechste_am" = "createdAt" + INTERVAL '2 days'
WHERE "source" = 'EVENT'
  AND "landing_page" = '/adn-schweiz'
  AND "notes" LIKE '%Marketing-Einwilligung: ja%'
  AND "sequenz_start_am" IS NULL
  AND "sequenz_stopp" IS NULL
  AND "status" IN ('NEW', 'CONTACTED')
  AND "email" IN (
    'andy.odeematt@prometheus.ch',
    'ds@cosus.de',
    'roland@rolandsagan.ch',
    'd.sturzenegger@db-it.ch',
    'oliver.kuhn@sunrise.net',
    'matthias.naber@care4it.ch',
    'jc@dieit.ag',
    'nemanja.trifunovic@aproda.ch',
    'marco.denzler@online.ch',
    'adi.oertli@gmail.com',
    'nicole.donner@sunrise.net'
  );
