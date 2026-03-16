import { NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { getBoard } from "@/lib/db/tasks";

export async function GET() {
  const session = await isTasksAuthenticated();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const columns = await getBoard();
  return NextResponse.json(columns);
}
