-- AlterTable: KI-Auswertung des First-Call-Transkripts (VTT → Claude Sonnet)
ALTER TABLE "first_call_scores"
    ADD COLUMN "transcript_text" TEXT,
    ADD COLUMN "transcript_filename" TEXT,
    ADD COLUMN "score_reasoning" JSONB,
    ADD COLUMN "analyzed_at" TIMESTAMP(3);
