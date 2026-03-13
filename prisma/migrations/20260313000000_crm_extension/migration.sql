-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'LINKEDIN', 'WEBINAR', 'COLD_OUTREACH', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'EMAIL', 'CALL', 'MEETING', 'STATUS_CHANGE', 'FOLLOW_UP');

-- AlterTable: Add CRM fields to waitlist table
ALTER TABLE "waitlist" ADD COLUMN "name" TEXT;
ALTER TABLE "waitlist" ADD COLUMN "company" TEXT;
ALTER TABLE "waitlist" ADD COLUMN "phone" TEXT;
ALTER TABLE "waitlist" ADD COLUMN "status" "LeadStatus" NOT NULL DEFAULT 'NEW';
ALTER TABLE "waitlist" ADD COLUMN "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE';
ALTER TABLE "waitlist" ADD COLUMN "notes" TEXT;
ALTER TABLE "waitlist" ADD COLUMN "score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "waitlist" ADD COLUMN "followUpAt" TIMESTAMP(3);
ALTER TABLE "waitlist" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "leadId" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "waitlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
