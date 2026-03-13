import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { ActivityType, LeadStatus } from "@prisma/client";

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { event, email, data } = body;

  if (!email || !event) {
    return NextResponse.json(
      { error: "Missing required fields: event, email" },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.findUnique({ where: { email } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  switch (event) {
    case "sequence_started": {
      const oldStatus = lead.status;
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "SEQUENCE_ACTIVE" as LeadStatus },
      });
      await logActivity(
        lead.id,
        "STATUS_CHANGE",
        "E-Mail-Sequenz gestartet (n8n)",
        oldStatus,
        "SEQUENCE_ACTIVE"
      );
      break;
    }

    case "webinar_registered": {
      const webinar = await prisma.webinar.findUnique({
        where: { id: data?.webinarId },
      });
      if (!webinar) {
        return NextResponse.json(
          { error: "Webinar not found" },
          { status: 404 }
        );
      }

      await prisma.webinarRegistration.upsert({
        where: {
          webinarId_leadId: { webinarId: data.webinarId, leadId: lead.id },
        },
        create: {
          webinarId: data.webinarId,
          leadId: lead.id,
          source: data.source,
        },
        update: { status: "REGISTERED" },
      });

      const oldStatus = lead.status;
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "WEBINAR_INVITED", webinarRegistered: true },
      });
      await logActivity(
        lead.id,
        "WEBINAR",
        `Für Webinar '${webinar.title}' registriert`,
        oldStatus,
        "WEBINAR_INVITED"
      );
      break;
    }

    case "email_opened": {
      await logActivity(
        lead.id,
        "EMAIL",
        `E-Mail geöffnet: ${data?.subject ?? "Unbekannte E-Mail"}`,
        null,
        null
      );
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

async function logActivity(
  leadId: string,
  type: string,
  content: string,
  oldValue: string | null,
  newValue: string | null
) {
  await prisma.leadActivity.create({
    data: {
      leadId,
      type: type as ActivityType,
      content,
      oldValue,
      newValue,
    },
  });
}
