import { NextRequest, NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await isTasksAuthenticated();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const { risk, priority, mitigation } = await req.json();

  const updated = await prisma.taskRisk.update({
    where: { id: parseInt(id) },
    data: {
      ...(risk !== undefined && { risk }),
      ...(priority !== undefined && { priority }),
      ...(mitigation !== undefined && { mitigation }),
    },
  });

  return NextResponse.json(updated);
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
  await prisma.taskRisk.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
