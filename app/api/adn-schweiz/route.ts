import { NextRequest, NextResponse } from "next/server";
import type { Lead } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import {
  bestaetigungUeberApp,
  sendeWartelisteBestaetigung,
  sequenzStartDaten,
} from "@/lib/followup/versand";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ADN_SCHWEIZ_LANDING_PAGE,
  ADN_SCHWEIZ_PDF_URL,
  buildAdnSchweizNotiz,
  parseUtm,
  type UtmWerte,
} from "@/lib/adn-schweiz/lead";

// Folien-Download der Seite /adn-schweiz (Vortrag ADN Schweiz, 28.10.2026).
//
// Legt einen Lead mit Status NEW (Default) und Quelle EVENT an, die Notiz
// steht in notes und als NOTE-Aktivität. Existiert die E-Mail bereits, wird
// der bestehende Lead nur ergänzt (leere Felder nachgetragen, NOTE-Aktivität
// angehängt), Status, Quelle und UTM-Werte bleiben unverändert. Der Download
// wird in beiden Fällen freigegeben.
//
// Mit Marketing-Einwilligung startet ein neuer Lead wie bei /api/waitlist in
// die Wartelisten-Sequenz: Bestätigung mit Sofort-Bonus über Resend, danach
// die vier Follow-ups. Ohne Einwilligung wird er nur eingetragen und bekommt
// keine Mail. Bestehende Leads bekommen nie eine Mail, sie stecken schon in
// einem Lauf oder sind längst weiter.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ValidationError extends Error {}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

interface AdnSchweizInput {
  email: string;
  name: string;
  firma: string;
  marketingConsent: boolean;
  utm: UtmWerte;
  referrer: string | null;
}

function validate(body: Record<string, unknown>): AdnSchweizInput {
  const email = text(body.email, 254).toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
  }

  if (body.privacy !== true) {
    throw new ValidationError("Bitte bestätigen Sie, dass Sie die Datenschutzerklärung gelesen haben.");
  }

  return {
    email,
    name: text(body.name, 120),
    firma: text(body.firma, 160),
    marketingConsent: body.marketing === true,
    utm: parseUtm(body),
    referrer: text(body.referrer, 500) || null,
  };
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

    // Großzügiger als /api/synaxon (10 pro Stunde): im Saal teilen sich viele
    // Geräte das WLAN des Veranstalters und damit dieselbe IP.
    if (!checkRateLimit(`adn-schweiz:${ip}`, 100, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten noch einmal." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Honeypot: Bots füllen das unsichtbare Feld aus. Still bestätigen, nichts speichern.
    if (typeof body.website === "string" && body.website.trim().length > 0) {
      return NextResponse.json({ success: true, download: ADN_SCHWEIZ_PDF_URL }, { status: 201 });
    }

    const input = validate(body);
    const notiz = buildAdnSchweizNotiz(input.utm, input.marketingConsent);

    let leadId: string;
    let neuerLead: Lead | null = null;

    const existing = await prisma.lead.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, company: true },
    });

    if (existing) {
      leadId = existing.id;
      if ((!existing.name && input.name) || (!existing.company && input.firma)) {
        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            name: existing.name || input.name || null,
            company: existing.company || input.firma || null,
          },
        });
      }
    } else {
      try {
        const created = await prisma.lead.create({
          data: {
            email: input.email,
            name: input.name || null,
            company: input.firma || null,
            notes: notiz,
            source: "EVENT",
            utmSource: input.utm.utm_source ?? null,
            utmMedium: input.utm.utm_medium ?? null,
            utmCampaign: input.utm.utm_campaign ?? null,
            utmContent: input.utm.utm_content ?? null,
            utmTerm: input.utm.utm_term ?? null,
            referrer: input.referrer,
            landingPage: ADN_SCHWEIZ_LANDING_PAGE,
            firstTouchAt: new Date(),
            ...(input.marketingConsent ? sequenzStartDaten() : {}),
          },
        });
        leadId = created.id;
        neuerLead = created;
      } catch (error) {
        // Zwei Absendungen gleichzeitig: der zweite Versuch ergänzt den ersten.
        if (!isUniqueViolation(error)) throw error;
        const raced = await prisma.lead.findUnique({
          where: { email: input.email },
          select: { id: true },
        });
        if (!raced) throw error;
        leadId = raced.id;
      }
    }

    await prisma.leadActivity.create({
      data: { leadId, type: "NOTE", content: notiz },
    });

    // Bestätigung nur über Resend, wenn die Vorlage "warteliste_bestaetigung"
    // aktiv ist. Kein n8n-Fallback: der schickte früher allen die Mail, auch
    // ohne Einwilligung.
    if (neuerLead && input.marketingConsent && (await bestaetigungUeberApp().catch(() => false))) {
      await sendeWartelisteBestaetigung(neuerLead, await resolveAppBaseUrl());
    }

    return NextResponse.json({ success: true, download: ADN_SCHWEIZ_PDF_URL }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("ADN Schweiz POST error:", error);
    return NextResponse.json(
      { error: "Da ist etwas schiefgelaufen. Bitte versuchen Sie es noch einmal oder schreiben Sie an info@next-skills.de." },
      { status: 500 }
    );
  }
}
