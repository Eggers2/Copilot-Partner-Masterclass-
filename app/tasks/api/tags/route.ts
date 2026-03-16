import { NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { getAllTags } from "@/lib/db/tasks";

export async function GET() {
  const session = await isTasksAuthenticated();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const tags = await getAllTags();
  return NextResponse.json(tags);
}
