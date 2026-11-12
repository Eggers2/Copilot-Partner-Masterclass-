-- Bot-Schutz für das Wartelisten-Formular: Protokoll abgewiesener und
-- verdächtiger Anmeldungen. Nur eine neue Tabelle, bestehende Daten bleiben
-- unverändert.
CREATE TABLE "anmeldung_schutz_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endpunkt" VARCHAR(40) NOT NULL,
    "ip_hash" VARCHAR(64),
    "grund" VARCHAR(40) NOT NULL,
    "email_domain" VARCHAR(255),
    "details" TEXT,

    CONSTRAINT "anmeldung_schutz_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "anmeldung_schutz_log_created_at_idx" ON "anmeldung_schutz_log"("created_at");
CREATE INDEX "anmeldung_schutz_log_grund_idx" ON "anmeldung_schutz_log"("grund");
