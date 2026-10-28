-- Einmalige Datenkorrektur: ADN-Schweiz-Leads (Folien-Download /adn-schweiz,
-- 28.10.2026), die die Seite ohne UTM-Parameter aufgerufen haben, bekommen
-- nachträglich die Kampagne des QR-Codes. Die beiden internen Testeinträge
-- bleiben ausgenommen. Leads, die vorher schon im CRM waren, haben eine
-- andere Quelle und sind davon nicht betroffen.
UPDATE "waitlist"
SET "utm_source" = 'adn',
    "utm_medium" = 'event',
    "utm_campaign" = 'adn_schweiz_okt26'
WHERE "source" = 'EVENT'
  AND "landing_page" = '/adn-schweiz'
  AND "utm_source" IS NULL
  AND "utm_medium" IS NULL
  AND "utm_campaign" IS NULL
  AND "email" NOT IN ('ae@nextvideo.de', 'info@example.com');
