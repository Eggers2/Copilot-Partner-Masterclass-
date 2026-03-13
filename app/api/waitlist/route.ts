import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "E-Mail-Adresse ist erforderlich." },
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

    const normalizedEmail = email.toLowerCase().trim();

    const entry = await prisma.lead.create({
      data: {
        email: normalizedEmail,
      },
    });

    // N8N Webhook: fire-and-forget – E-Mail-Benachrichtigung bei neuer Anmeldung
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          timestamp: new Date().toISOString(),
          entryId: entry.id,
          source: "application",
        }),
      })
        .then((res) => {
          if (!res.ok) console.error(`N8N webhook returned ${res.status}`);
        })
        .catch((err) => console.error("N8N webhook delivery failed:", err));
    }

    return NextResponse.json(
      {
        success: true,
        message: "Deine Bewerbung wurde erfolgreich eingereicht!",
        id: entry.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Mit dieser E-Mail-Adresse liegt bereits eine Bewerbung vor.",
        },
        { status: 409 }
      );
    }

    console.error("Waitlist POST error:", error);
    return NextResponse.json(
      { error: "Ein interner Fehler ist aufgetreten. Bitte versuche es erneut." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID ist erforderlich." }, { status: 400 });
    }

    await prisma.lead.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Eintrag nicht gefunden." }, { status: 404 });
    }
    console.error("Waitlist DELETE error:", error);
    return NextResponse.json(
      { error: "Ein interner Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    const entries = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      total: entries.length,
      entries,
    });
  } catch (error) {
    console.error("Waitlist GET error:", error);
    return NextResponse.json(
      { error: "Ein interner Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
