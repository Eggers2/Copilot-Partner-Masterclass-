-- CreateTable
CREATE TABLE "task_users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_columns" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "position" INTEGER NOT NULL,
    "color" VARCHAR(7),

    CONSTRAINT "task_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "column_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "workstream" VARCHAR(50),
    "responsible" VARCHAR(30),
    "priority" VARCHAR(20),
    "deadline" DATE,
    "notes" TEXT,
    "week_label" VARCHAR(100),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_tags" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "category" VARCHAR(30),

    CONSTRAINT "task_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_tag_assignments" (
    "task_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "task_tag_assignments_pkey" PRIMARY KEY ("task_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_users_username_key" ON "task_users"("username");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "task_columns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "task_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_tag_assignments" ADD CONSTRAINT "task_tag_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_tag_assignments" ADD CONSTRAINT "task_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "task_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
