-- Add revenue column to waitlist (Lead) table
ALTER TABLE "waitlist" ADD COLUMN "revenue" INTEGER NOT NULL DEFAULT 0;

-- Migrate existing leads with removed statuses to alternatives
UPDATE "waitlist" SET "status" = 'CONTACTED' WHERE "status" = 'SEQUENCE_ACTIVE';
UPDATE "waitlist" SET "status" = 'CONTACTED' WHERE "status" = 'WEBINAR_INVITED';

-- Migrate activity log references
UPDATE "lead_activities" SET "old_value" = 'CONTACTED' WHERE "old_value" = 'SEQUENCE_ACTIVE';
UPDATE "lead_activities" SET "new_value" = 'CONTACTED' WHERE "new_value" = 'SEQUENCE_ACTIVE';
UPDATE "lead_activities" SET "old_value" = 'CONTACTED' WHERE "old_value" = 'WEBINAR_INVITED';
UPDATE "lead_activities" SET "new_value" = 'CONTACTED' WHERE "new_value" = 'WEBINAR_INVITED';

-- Remove enum values (PostgreSQL)
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST', 'WAITLIST', 'WEBINAR_ATTENDED', 'FOLLOW_UP');
ALTER TABLE "waitlist" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "waitlist" ALTER COLUMN "status" TYPE "LeadStatus" USING ("status"::text::"LeadStatus");
ALTER TABLE "waitlist" ALTER COLUMN "status" SET DEFAULT 'NEW';
DROP TYPE "LeadStatus_old";
