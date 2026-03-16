import { NextRequest, NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { moveTask } from "@/lib/db/tasks";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await isTasksAuthenticated();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const { columnId, position } = await req.json();

  if (!columnId || position === undefined) {
    return NextResponse.json({ error: "columnId und position sind Pflicht." }, { status: 400 });
  }

  const task = await moveTask(parseInt(id), columnId, position);
  return NextResponse.json(task);
}
