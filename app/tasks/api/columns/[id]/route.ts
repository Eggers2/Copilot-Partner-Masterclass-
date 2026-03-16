import { NextRequest, NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { updateColumn } from "@/lib/db/tasks";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await isTasksAuthenticated();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const column = await updateColumn(parseInt(id), {
    name: body.name,
    color: body.color,
    position: body.position,
  });

  return NextResponse.json(column);
}
