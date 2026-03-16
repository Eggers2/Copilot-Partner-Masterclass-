-- CreateTable
CREATE TABLE "task_risks" (
    "id" SERIAL NOT NULL,
    "risk" VARCHAR(255) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "mitigation" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_risks_pkey" PRIMARY KEY ("id")
);
