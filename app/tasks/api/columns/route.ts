import { NextRequest, NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { createColumn } from "@/lib/db/tasks";

export async function POST(req: NextRequest) {
  const session = await isTasksAuthenticated();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { name, color } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name ist Pflicht." }, { status: 400 });
  }

  const column = await createColumn({ name, color });
  return NextResponse.json(column, { status: 201 });
}
