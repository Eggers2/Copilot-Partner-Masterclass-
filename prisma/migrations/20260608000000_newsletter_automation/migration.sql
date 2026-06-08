-- Newsletter-Automatik: Freigabe-Status, Freigabe-Zeitstempel und Abmelde-Liste

-- Neuer Status APPROVED (Do-Entwurf wurde für den Fr-Versand freigegeben).
-- Hinweis: In PostgreSQL darf ein per ALTER TYPE ... ADD VALUE hinzugefügter
-- Enum-Wert nicht in derselben Transaktion verwendet werden – das tun wir hier
-- auch nicht (nur Schema-DDL), daher unkritisch.
ALTER TYPE "NewsletterStatus" ADD VALUE 'APPROVED';

-- Zeitpunkt der Freigabe (1-Klick-Link oder Editor-Button).
ALTER TABLE "newsletters" ADD COLUMN "freigegeben_am" TIMESTAMP(3);

-- Suppression-Liste: vom Newsletter abgemeldete Adressen werden beim Versand
-- herausgefiltert.
CREATE TABLE "newsletter_abmeldungen" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "grund" TEXT,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_abmeldungen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "newsletter_abmeldungen_email_key" ON "newsletter_abmeldungen"("email");
