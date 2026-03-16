import { prisma } from "../prisma";

export async function getBoard() {
  const columns = await prisma.taskColumn.findMany({
    orderBy: { position: "asc" },
    include: {
      tasks: {
        orderBy: { position: "asc" },
        include: {
          tags: { include: { tag: true } },
        },
      },
    },
  });
  return columns;
}

export async function getTask(id: number) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      column: true,
    },
  });
}

export async function createTask(data: {
  title: string;
  description?: string;
  columnId: number;
  workstream?: string;
  responsible?: string;
  priority?: string;
  deadline?: Date;
  notes?: string;
  weekLabel?: string;
  createdBy?: number;
  tagIds?: number[];
}) {
  const maxPos = await prisma.task.aggregate({
    where: { columnId: data.columnId },
    _max: { position: true },
  });

  const { tagIds, ...taskData } = data;

  const task = await prisma.task.create({
    data: {
      ...taskData,
      position: (maxPos._max.position || 0) + 1,
      tags: tagIds
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: {
      tags: { include: { tag: true } },
      column: true,
    },
  });

  return task;
}

export async function updateTask(
  id: number,
  data: {
    title?: string;
    description?: string;
    workstream?: string;
    responsible?: string;
    priority?: string;
    deadline?: Date | null;
    notes?: string;
    weekLabel?: string;
    tagIds?: number[];
  }
) {
  const { tagIds, ...updateData } = data;

  if (tagIds !== undefined) {
    await prisma.taskTagAssignment.deleteMany({ where: { taskId: id } });
    await prisma.taskTagAssignment.createMany({
      data: tagIds.map((tagId) => ({ taskId: id, tagId })),
    });
  }

  return prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      tags: { include: { tag: true } },
      column: true,
    },
  });
}

export async function moveTask(id: number, columnId: number, position: number) {
  // Shift positions in target column
  await prisma.task.updateMany({
    where: { columnId, position: { gte: position } },
    data: { position: { increment: 1 } },
  });

  return prisma.task.update({
    where: { id },
    data: { columnId, position },
    include: {
      tags: { include: { tag: true } },
      column: true,
    },
  });
}

export async function deleteTask(id: number) {
  return prisma.task.delete({ where: { id } });
}

export async function getAllTags() {
  return prisma.taskTag.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
}

export async function getColumns() {
  return prisma.taskColumn.findMany({ orderBy: { position: "asc" } });
}

export async function createColumn(data: { name: string; color?: string }) {
  const maxPos = await prisma.taskColumn.aggregate({ _max: { position: true } });
  return prisma.taskColumn.create({
    data: { ...data, position: (maxPos._max.position || 0) + 1 },
  });
}

export async function updateColumn(id: number, data: { name?: string; color?: string; position?: number }) {
  return prisma.taskColumn.update({ where: { id }, data });
}

export async function getTaskStats() {
  const total = await prisma.task.count();
  const doneColumn = await prisma.taskColumn.findFirst({ where: { name: "Erledigt ✅" } });
  const done = doneColumn
    ? await prisma.task.count({ where: { columnId: doneColumn.id } })
    : 0;

  const overdue = await prisma.task.count({
    where: {
      deadline: { lt: new Date() },
      column: { name: { not: "Erledigt ✅" } },
    },
  });

  const upcoming = await prisma.task.findMany({
    where: {
      deadline: { gte: new Date() },
      column: { name: { not: "Erledigt ✅" } },
    },
    orderBy: { deadline: "asc" },
    take: 5,
    include: { tags: { include: { tag: true } }, column: true },
  });

  const byWeek = await prisma.task.groupBy({
    by: ["weekLabel"],
    _count: true,
    orderBy: { weekLabel: "asc" },
  });

  const byWeekDone = doneColumn
    ? await prisma.task.groupBy({
        by: ["weekLabel"],
        where: { columnId: doneColumn.id },
        _count: true,
      })
    : [];

  return { total, done, overdue, upcoming, byWeek, byWeekDone };
}
