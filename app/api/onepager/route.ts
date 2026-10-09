import { NextRequest, NextResponse } from "next/server";
import { LeadSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ONEPAGER_BETREFF, sendOnePagerEmail } from "@/lib/email/onePager";

// One-Pager-Anforderung der LinkedIn-Landingpage (/linkedin).
//
// Legt einen Lead mit Status NEW an (Quelle aus utm_source wie bei
// /api/waitlist) oder ergänzt beim bestehenden Lead nur eine Aktivität,
// ohne Felder zu überschreiben. Danach geht der One-Pager per Resend raus.
// Bewusst KEIN Aufruf von N8N_WEBHOOK_URL: daran hängt die Wartelisten-
// Sequenz, die würde den Lead auf CONTACTED setzen. Alex fasst persönlich nach.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEHLER_TEXT =
  "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal oder schreiben Sie an info@next-skills.de.";

function truncate(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

// Gleiche Zuordnung wie parseLeadSource in /api/waitlist.
function parseLeadSource(utmSource: string | null): LeadSource | undefined {
  if (!utmSource) return undefined;
  switch (utmSource.toLowerCase()) {
    case "linkedin":
      return LeadSource.LINKEDIN;
    case "referral":
      return LeadSource.REFERRAL;
    case "webinar":
      return LeadSource.WEBINAR;
    default:
      return undefined;
  }
}

function parseFirstTouchAt(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Der Endpunkt verschickt Mails an beliebige Adressen, daher eng begrenzt.
    if (!checkRateLimit(`onepager:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es später noch einmal." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Honeypot: Bots füllen das unsichtbare Feld aus. Still bestätigen, nichts speichern.
    if (typeof body.website === "string" && body.website.trim().length > 0) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const email = (truncate(body.email, 254) ?? "").toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." },
        { status: 400 }
      );
    }
    const firma = truncate(body.firma, 160);

    const utmSource = truncate(body.utm_source, 100);
    const utmMedium = truncate(body.utm_medium, 100);
    const utmCampaign = truncate(body.utm_campaign, 100);
    const utmContent = truncate(body.utm_content, 100);
    const utmTerm = truncate(body.utm_term, 100);
    const referrer = truncate(body.referrer, 500);
    const landingPage = truncate(body.landing_page, 500);
    const firstTouchAt = parseFirstTouchAt(body.first_touch_at);
    const mappedSource = parseLeadSource(utmSource);

    let leadId: string;
    const existing = await prisma.lead.findUnique({ where: { email }, select: { id: true } });

    if (existing) {
      leadId = existing.id;
    } else {
      try {
        const created = await prisma.lead.create({
          data: {
            email,
            status: "NEW",
            company: firma,
            utmSource,
            utmMedium,
            utmCampaign,
            utmContent,
            utmTerm,
            referrer,
            landingPage,
            firstTouchAt,
            ...(mappedSource ? { source: mappedSource } : {}),
          },
          select: { id: true },
        });
        leadId = created.id;
      } catch (error) {
        // Zwei Absendungen gleichzeitig: der zweite Versuch ergänzt den ersten.
        if (!isUniqueViolation(error)) throw error;
        const raced = await prisma.lead.findUnique({ where: { email }, select: { id: true } });
        if (!raced) throw error;
        leadId = raced.id;
      }
    }

    await prisma.leadActivity.create({
      data: {
        leadId,
        type: "NOTE",
        content:
          `One-Pager über LinkedIn-Landingpage angefordert (utm_content=${utmContent ?? "leer"})` +
          (existing && firma ? `\nAngegebene Firma: ${firma}` : ""),
      },
    });

    const mail = await sendOnePagerEmail(email);

    if (!mail.ok) {
      console.error("[onepager] Versand fehlgeschlagen:", mail.error);
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: "EMAIL",
          content: `One-Pager-Mail fehlgeschlagen${mail.error ? `: ${mail.error}` : ""}`,
        },
      });
      return NextResponse.json({ error: FEHLER_TEXT }, { status: 502 });
    }

    await prisma.leadActivity.create({
      data: { leadId, type: "EMAIL", content: `One-Pager-Mail versendet: ${ONEPAGER_BETREFF}` },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Onepager POST error:", error);
    return NextResponse.json({ error: FEHLER_TEXT }, { status: 500 });
  }
}
