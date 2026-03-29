-- AlterTable: Rename zoom_link to streamyard_link
ALTER TABLE "webinars" RENAME COLUMN "zoom_link" TO "streamyard_link";

-- AlterTable: Remove duration_min and max_attendees columns
ALTER TABLE "webinars" DROP COLUMN IF EXISTS "duration_min";
ALTER TABLE "webinars" DROP COLUMN IF EXISTS "max_attendees";
