import { NextRequest, NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await isTasksAuthenticated();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const users = await prisma.taskUser.findMany({
    orderBy: { id: "asc" },
    select: { id: true, username: true, displayName: true, role: true, createdAt: true },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await isTasksAuthenticated();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { username, password, displayName, role } = await req.json();

  if (!username || !password || !displayName) {
    return NextResponse.json({ error: "Alle Felder sind Pflicht." }, { status: 400 });
  }

  const existing = await prisma.taskUser.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Benutzername bereits vergeben." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.taskUser.create({
    data: { username, passwordHash, displayName, role: role || "member" },
  });

  return NextResponse.json(
    { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    { status: 201 }
  );
}
