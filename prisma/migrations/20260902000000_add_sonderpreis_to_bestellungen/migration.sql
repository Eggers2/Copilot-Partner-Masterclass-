-- Manuell im Admin vereinbarter Sonderpreis (netto) je Bestellung.
--
-- Ist die Spalte gesetzt, ersetzt sie Listenpreis und ADN-Anpassung als
-- fakturierten Netto-Betrag: preis_netto, mwst_betrag und preis_brutto werden
-- daraus neu berechnet, list_preis_netto behaelt den regulaeren Listenpreis.
-- NULL bedeutet: regulaerer Preis aus Paket und Zahlungsmodell.
ALTER TABLE "bestellungen" ADD COLUMN "sonderpreis_netto" DECIMAL(10,2);
