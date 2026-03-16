import { NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await isTasksAuthenticated();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  // 1. Remove duplicate tasks — keep only the one with the lowest id per title
  const allTasks = await prisma.task.findMany({
    orderBy: { id: "asc" },
    select: { id: true, title: true },
  });

  const seen = new Map<string, number>();
  const duplicateIds: number[] = [];

  for (const task of allTasks) {
    if (seen.has(task.title)) {
      duplicateIds.push(task.id);
    } else {
      seen.set(task.title, task.id);
    }
  }

  if (duplicateIds.length > 0) {
    await prisma.taskTagAssignment.deleteMany({
      where: { taskId: { in: duplicateIds } },
    });
    await prisma.task.deleteMany({
      where: { id: { in: duplicateIds } },
    });
  }

  // 2. Rename "DU" → "Katherina" in tasks.responsible (catch any remaining)
  await prisma.task.updateMany({
    where: { responsible: "DU" },
    data: { responsible: "Katherina" },
  });

  // 3. Rename the responsible tag "🎨 DU" → "🎨 Katherina" (catch any remaining)
  await prisma.taskTag.updateMany({
    where: { name: "🎨 DU", category: "responsible" },
    data: { name: "🎨 Katherina" },
  });

  // 4. Delete duplicate tags (keep lowest id per name)
  const allTags = await prisma.taskTag.findMany({ orderBy: { id: "asc" } });
  const seenTags = new Map<string, number>();
  const dupTagIds: number[] = [];
  for (const t of allTags) {
    if (seenTags.has(t.name)) {
      dupTagIds.push(t.id);
    } else {
      seenTags.set(t.name, t.id);
    }
  }
  if (dupTagIds.length > 0) {
    await prisma.taskTagAssignment.deleteMany({ where: { tagId: { in: dupTagIds } } });
    await prisma.taskTag.deleteMany({ where: { id: { in: dupTagIds } } });
  }

  return NextResponse.json({
    success: true,
    duplicatesRemoved: duplicateIds.length,
    tasksRemaining: seen.size,
  });
}
