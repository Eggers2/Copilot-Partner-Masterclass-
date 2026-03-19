-- First Call Scoring: Qualifikations-Scorecard für Erstgespräche
CREATE TABLE IF NOT EXISTS "first_call_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,

    -- Scorecard-Kriterien (je 1–5 Punkte)
    "copilot_demand" INTEGER NOT NULL DEFAULT 1,
    "current_offer" INTEGER NOT NULL DEFAULT 1,
    "team_capacity" INTEGER NOT NULL DEFAULT 1,
    "decision_maker" INTEGER NOT NULL DEFAULT 1,
    "budget_readiness" INTEGER NOT NULL DEFAULT 1,
    "urgency" INTEGER NOT NULL DEFAULT 1,
    "mindset" INTEGER NOT NULL DEFAULT 1,
    "ms_partner_status" INTEGER NOT NULL DEFAULT 1,
    "total_score" INTEGER NOT NULL DEFAULT 8,

    -- Gesprächsnotizen
    "pain_point" TEXT,
    "team_size" TEXT,
    "recommended_package" TEXT,
    "objections" TEXT,
    "next_step" TEXT,
    "follow_up_date" DATE,
    "contact_source" TEXT,

    -- Zeitstempel
    "called_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "first_call_scores_pkey" PRIMARY KEY ("id")
);

-- Ein Lead hat maximal einen First-Call-Score
CREATE UNIQUE INDEX "first_call_scores_lead_id_key" ON "first_call_scores"("lead_id");

-- Fremdschlüssel mit Cascade-Löschung
ALTER TABLE "first_call_scores"
    ADD CONSTRAINT "first_call_scores_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "waitlist"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
