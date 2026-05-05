-- DropTable
DROP TABLE "kunden_magic_links";

-- CreateTable
CREATE TABLE "kunden_otp_codes" (
    "id" SERIAL NOT NULL,
    "code_hash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ablauf_am" TIMESTAMP(3) NOT NULL,
    "eingeloest" BOOLEAN NOT NULL DEFAULT false,
    "fehlversuche" INTEGER NOT NULL DEFAULT 0,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kunden_otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kunden_otp_codes_email_ablauf_am_idx" ON "kunden_otp_codes"("email", "ablauf_am");
