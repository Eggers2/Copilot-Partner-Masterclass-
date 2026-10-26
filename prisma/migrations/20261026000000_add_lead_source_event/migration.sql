-- Neue Lead-Quelle für Vorträge und Veranstaltungen (erste Nutzung:
-- Folien-Download /adn-schweiz). Das konkrete Event steht in utm_campaign
-- und in der Notiz am Lead.
--
-- Hinweis: Der Enum-Wert wird in dieser Migration nicht verwendet, daher
-- unkritisch für ALTER TYPE ... ADD VALUE innerhalb einer Transaktion.
ALTER TYPE "LeadSource" ADD VALUE 'EVENT';
