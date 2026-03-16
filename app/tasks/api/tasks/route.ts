import { NextRequest, NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { createTask } from "@/lib/db/tasks";

export async function POST(req: NextRequest) {
  const session = await isTasksAuthenticated();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = await req.json();
  const { title, columnId, description, workstream, responsible, priority, deadline, notes, weekLabel, tagIds } = body;

  if (!title || !columnId) {
    return NextResponse.json({ error: "Titel und Spalte sind Pflicht." }, { status: 400 });
  }

  const task = await createTask({
    title,
    columnId,
    description,
    workstream,
    responsible,
    priority,
    deadline: deadline ? new Date(deadline) : undefined,
    notes,
    weekLabel,
    createdBy: session.userId,
    tagIds,
  });

  return NextResponse.json(task, { status: 201 });
}
