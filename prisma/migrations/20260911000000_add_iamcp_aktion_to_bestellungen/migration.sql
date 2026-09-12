-- IAMCP-Aktion je Bestellung (ADN-Vertriebskanal).
--
-- Ist die Spalte gesetzt, erhaelt ADN 5% Rabatt auf den fakturierten
-- Netto-Betrag. Der Rabatt greift nach der ADN-Kanal-Anpassung (bei ADN 85/15
-- also auf die 85% des Listenpreises), list_preis_netto behaelt den regulaeren
-- Listenpreis. Ein gesetzter sonderpreis_netto ersetzt den Rabatt.
ALTER TABLE "bestellungen" ADD COLUMN "iamcp_aktion" BOOLEAN NOT NULL DEFAULT false;
