import { NextRequest, NextResponse } from "next/server";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_RISKS = [
  { risk: "ADN-Kooperation kommt nicht zustande", priority: "Hoch", mitigation: "Direkte Ansprache über LinkedIn, KI League, IAMCP", position: 1 },
  { risk: "Kein Spezial-Angebot am Transformation Day möglich", priority: "Hoch", mitigation: "Standard-Early-Bird als Handout", position: 2 },
  { risk: "Zu wenig Wartelisten-Leads bis 27.4.", priority: "Hoch", mitigation: "Paid Ads früher starten", position: 3 },
  { risk: "Content-Produktion zu langsam", priority: "Mittel", mitigation: "Launch mit 3-4 Modulen", position: 4 },
  { risk: "Microsoft Incentive Funding fällt weg", priority: "Mittel", mitigation: "ROI-Argumentation stärken", position: 5 },
  { risk: "Webinar-Conversion zu niedrig", priority: "Mittel", mitigation: "A/B-Test, Reminder-Mails", position: 6 },
  { risk: "Plattform-Probleme", priority: "Niedrig", mitigation: "Fallback-Plan", position: 7 },
];

async function ensureRisks() {
  const count = await prisma.taskRisk.count();
  if (count === 0) {
    await prisma.taskRisk.createMany({ data: DEFAULT_RISKS });
  }
}

export async function GET() {
  const session = await isTasksAuthenticated();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  await ensureRisks();
  const risks = await prisma.taskRisk.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json(risks);
}

export async function POST(req: NextRequest) {
  const session = await isTasksAuthenticated();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { risk, priority, mitigation } = await req.json();
  if (!risk || !priority || !mitigation) {
    return NextResponse.json({ error: "Alle Felder sind Pflicht." }, { status: 400 });
  }

  const maxPos = await prisma.taskRisk.aggregate({ _max: { position: true } });
  const newRisk = await prisma.taskRisk.create({
    data: { risk, priority, mitigation, position: (maxPos._max.position || 0) + 1 },
  });

  return NextResponse.json(newRisk, { status: 201 });
}
