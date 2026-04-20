-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "newsletters" (
    "id" TEXT NOT NULL,
    "ausgabe_nr" INTEGER NOT NULL,
    "kw" INTEGER NOT NULL,
    "jahr" INTEGER NOT NULL,
    "titel" TEXT NOT NULL DEFAULT 'Copilot Insider Update',
    "subtitle" TEXT,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "html" TEXT,
    "zusatz_mails" TEXT,
    "recipients" JSONB,
    "gesendet_am" TIMESTAMP(3),
    "fehler_text" TEXT,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "newsletters_status_gesendet_am_idx" ON "newsletters"("status", "gesendet_am");
