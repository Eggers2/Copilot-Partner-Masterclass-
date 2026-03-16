import { NextRequest, NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await isTasksAuthenticated();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { id } = await params;
  const { displayName, role, password } = await req.json();

  const data: Record<string, string> = {};
  if (displayName) data.displayName = displayName;
  if (role) data.role = role;
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.taskUser.update({
    where: { id: parseInt(id) },
    data,
    select: { id: true, username: true, displayName: true, role: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await isTasksAuthenticated();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);

  // Don't allow deleting yourself
  if (userId === session.userId) {
    return NextResponse.json({ error: "Du kannst dich nicht selbst löschen." }, { status: 400 });
  }

  await prisma.taskUser.delete({ where: { id: userId } });
  return NextResponse.json({ success: true });
}
