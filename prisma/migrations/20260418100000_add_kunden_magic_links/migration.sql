-- CreateTable
CREATE TABLE "kunden_magic_links" (
    "id" SERIAL NOT NULL,
    "token_hash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ablauf_am" TIMESTAMP(3) NOT NULL,
    "eingeloest" BOOLEAN NOT NULL DEFAULT false,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kunden_magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kunden_magic_links_token_hash_key" ON "kunden_magic_links"("token_hash");

-- CreateIndex
CREATE INDEX "kunden_magic_links_email_idx" ON "kunden_magic_links"("email");

-- CreateIndex
CREATE INDEX "kunden_magic_links_ablauf_am_idx" ON "kunden_magic_links"("ablauf_am");
