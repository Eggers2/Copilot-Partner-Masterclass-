import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { email, firstName, company } = await req.json();

    if (!email || !firstName) {
      return NextResponse.json(
        { error: "E-Mail und Vorname sind erforderlich." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 }
      );
    }

    const webinar = await prisma.webinar.findUnique({
      where: { slug },
      include: { _count: { select: { registrations: true } } },
    });

    if (!webinar || webinar.status !== "OPEN") {
      return NextResponse.json(
        { error: "Webinar nicht verfügbar." },
        { status: 400 }
      );
    }

    if (webinar._count.registrations >= webinar.maxAttendees) {
      return NextResponse.json(
        { error: "Webinar ist ausgebucht." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const lead = await prisma.lead.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        name: firstName,
        company: company || null,
        status: "WEBINAR_INVITED",
        source: "WEBSITE",
        webinarRegistered: true,
      },
      update: {
        status: "WEBINAR_INVITED",
        webinarRegistered: true,
        name: firstName,
        ...(company ? { company } : {}),
      },
    });

    await prisma.webinarRegistration.upsert({
      where: {
        webinarId_leadId: { webinarId: webinar.id, leadId: lead.id },
      },
      create: { webinarId: webinar.id, leadId: lead.id },
      update: { status: "REGISTERED" },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "WEBINAR",
        content: `Webinar-Anmeldung: ${webinar.title}`,
        newValue: webinar.id,
      },
    });

    // Trigger n8n confirmation email (fire-and-forget)
    const webhookUrl = process.env.N8N_WEBHOOK_URL_WEBINAR_CONFIRM;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lead.email,
          firstName,
          webinarTitle: webinar.title,
          webinarDate: webinar.scheduledAt,
          zoomLink: webinar.zoomLink,
        }),
      }).catch((err) =>
        console.error("Webinar confirmation webhook failed:", err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Webinar registration error:", error);
    return NextResponse.json(
      { error: "Ein interner Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
