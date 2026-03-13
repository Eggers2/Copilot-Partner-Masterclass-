-- AlterEnum: Add new values to LeadStatus
ALTER TYPE "LeadStatus" ADD VALUE 'WAITLIST';
ALTER TYPE "LeadStatus" ADD VALUE 'SEQUENCE_ACTIVE';
ALTER TYPE "LeadStatus" ADD VALUE 'WEBINAR_INVITED';
ALTER TYPE "LeadStatus" ADD VALUE 'WEBINAR_ATTENDED';
ALTER TYPE "LeadStatus" ADD VALUE 'FOLLOW_UP';

-- AlterEnum: Add WEBINAR to ActivityType
ALTER TYPE "ActivityType" ADD VALUE 'WEBINAR';

-- CreateEnum: WebinarStatus
CREATE TYPE "WebinarStatus" AS ENUM ('PLANNED', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum: RegistrationStatus
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'NO_SHOW', 'CANCELLED');

-- AlterTable: Add webinar_registered to waitlist
ALTER TABLE "waitlist" ADD COLUMN "webinar_registered" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add old_value and new_value to lead_activities
ALTER TABLE "lead_activities" ADD COLUMN "old_value" TEXT;
ALTER TABLE "lead_activities" ADD COLUMN "new_value" TEXT;

-- CreateTable: webinars
CREATE TABLE "webinars" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 60,
    "zoom_link" TEXT,
    "max_attendees" INTEGER NOT NULL DEFAULT 50,
    "status" "WebinarStatus" NOT NULL DEFAULT 'PLANNED',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webinars_pkey" PRIMARY KEY ("id")
);

-- CreateTable: webinar_registrations
CREATE TABLE "webinar_registrations" (
    "id" TEXT NOT NULL,
    "webinar_id" TEXT NOT NULL,
    "lead_id" UUID NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attended_at" TIMESTAMP(3),
    "source" TEXT,

    CONSTRAINT "webinar_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique slug for webinars
CREATE UNIQUE INDEX "webinars_slug_key" ON "webinars"("slug");

-- CreateIndex: unique webinar+lead combination
CREATE UNIQUE INDEX "webinar_registrations_webinar_id_lead_id_key" ON "webinar_registrations"("webinar_id", "lead_id");

-- CreateIndex: indexes for webinar_registrations
CREATE INDEX "webinar_registrations_lead_id_idx" ON "webinar_registrations"("lead_id");
CREATE INDEX "webinar_registrations_webinar_id_idx" ON "webinar_registrations"("webinar_id");

-- AddForeignKey: webinar_registrations -> webinars
ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: webinar_registrations -> waitlist (leads)
ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "waitlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
