import { NextRequest, NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { getTask, updateTask, deleteTask } from "@/lib/db/tasks";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await isTasksAuthenticated();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const task = await getTask(parseInt(id));
  if (!task) {
    return NextResponse.json({ error: "Aufgabe nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await isTasksAuthenticated();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const task = await updateTask(parseInt(id), {
    title: body.title,
    description: body.description,
    workstream: body.workstream,
    responsible: body.responsible,
    priority: body.priority,
    deadline: body.deadline === null ? null : body.deadline ? new Date(body.deadline) : undefined,
    notes: body.notes,
    weekLabel: body.weekLabel,
    tagIds: body.tagIds,
  });

  return NextResponse.json(task);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await isTasksAuthenticated();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  await deleteTask(parseInt(id));
  return NextResponse.json({ success: true });
}
