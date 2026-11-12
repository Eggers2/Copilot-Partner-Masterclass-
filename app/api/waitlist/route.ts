import { NextRequest, NextResponse } from "next/server";
import { LeadSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import { addActivity } from "@/lib/db/leads";
import { KEINE_MAILS_GRUND } from "@/lib/leads/keineMails";
import { checkRateLimit } from "@/lib/rate-limit";
import { loeseWartelisteBestaetigungAus, sequenzStartDaten } from "@/lib/followup/versand";
import { clientIp, protokolliere } from "@/lib/anmeldeschutz/log";
import { pruefeAnmeldung } from "@/lib/anmeldeschutz/pruefung";
import { turnstileSecret } from "@/lib/anmeldeschutz/turnstile";

// Wartelisten-Formular der Startseite (app/LandingPage.tsx).
//
// Bot-Schutz (lib/anmeldeschutz): Rate Limit, Honeypot, Zeitfalle, Turnstile,
// Pflichtfelder Name und Firma, Wegwerf-Domains. Erkannte Bots bekommen eine
// Erfolgsantwort, ohne dass etwas angelegt wird. Verdächtige Anmeldungen
// landen in der Prüfquarantäne: Lead mit "Keine E-Mails", ohne Sequenz, bis
// Alex ihn im Admin freigibt. Jede Abweisung steht in anmeldung_schutz_log.

const ENDPUNKT = "waitlist";
const RATE_LIMIT = 5;
const RATE_FENSTER_MS = 60 * 60 * 1000;

function truncate(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

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

/** Gleiche Antwort für neue, bereits vorhandene und still verworfene Anmeldungen. */
function erfolg(status: 200 | 201 = 201) {
  return NextResponse.json(
    { success: true, message: "Ihre Bewerbung wurde erfolgreich eingereicht." },
    { status }
  );
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  try {
    if (!checkRateLimit(`waitlist:${ip ?? "unbekannt"}`, RATE_LIMIT, RATE_FENSTER_MS)) {
      await protokolliere({ endpunkt: ENDPUNKT, grund: "rate_limit", ip });
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es später noch einmal." },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      body = {};
    }

    const entscheidung = await pruefeAnmeldung(body, { ip, turnstileSecret: turnstileSecret() });

    if (entscheidung.aktion === "still") {
      await protokolliere({ endpunkt: ENDPUNKT, ip, ...entscheidung });
      return erfolg(200);
    }
    if (entscheidung.aktion === "abweisen") {
      await protokolliere({ endpunkt: ENDPUNKT, ip, ...entscheidung });
      return NextResponse.json({ error: entscheidung.meldung }, { status: 400 });
    }

    for (const p of entscheidung.protokoll) {
      await protokolliere({ endpunkt: ENDPUNKT, ip, emailDomain: entscheidung.emailDomain, ...p });
    }

    const { email, name, company, verdacht, hinweise } = entscheidung;

    // Bestehender Lead: nichts ändern, keine Mail, gleiche Antwort wie bei
    // einer neuen Anmeldung (sonst ließe sich ablesen, wer eingetragen ist).
    const vorhanden = await prisma.lead.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (vorhanden) {
      await protokolliere({ endpunkt: ENDPUNKT, grund: "bereits_vorhanden", ip, emailDomain: entscheidung.emailDomain });
      return erfolg();
    }

    const utmSource = truncate(body.utm_source, 100);
    const mappedSource = parseLeadSource(utmSource);
    const quarantaene = verdacht.length > 0;
    const notizZeilen = [
      ...hinweise.map((h) => `Hinweis: ${h}`),
      ...(quarantaene ? [`Bot-Prüfung: ${verdacht.join("; ")}`] : []),
    ];

    const entry = await prisma.lead.create({
      data: {
        email,
        name,
        company,
        notes: notizZeilen.length > 0 ? notizZeilen.join("\n") : null,
        utmSource,
        utmMedium: truncate(body.utm_medium, 100),
        utmCampaign: truncate(body.utm_campaign, 100),
        utmContent: truncate(body.utm_content, 100),
        utmTerm: truncate(body.utm_term, 100),
        referrer: truncate(body.referrer, 500),
        landingPage: truncate(body.landing_page, 500),
        firstTouchAt: parseFirstTouchAt(body.first_touch_at),
        ...(mappedSource ? { source: mappedSource } : {}),
        ...(quarantaene
          ? // Prüfquarantäne: keine Mails, keine Sequenz bis zur Freigabe im Admin.
            { keineMailsAm: new Date(), keineMailsGrund: KEINE_MAILS_GRUND.botVerdacht }
          : // Follow-up-Sequenz (lib/followup): vier Mails an Tag 2, 5, 9 und 14.
            sequenzStartDaten()),
      },
    });

    if (quarantaene) {
      await addActivity(entry.id, {
        type: "NOTE",
        content: `Keine E-Mails: ${KEINE_MAILS_GRUND.botVerdacht} (${verdacht.join("; ")}). Freigabe auf der Lead-Seite.`,
      });
      await protokolliere({
        endpunkt: ENDPUNKT,
        grund: "verdacht_quarantaene",
        ip,
        emailDomain: entscheidung.emailDomain,
        details: verdacht.join("; "),
      });
    } else {
      await loeseWartelisteBestaetigungAus(entry, await resolveAppBaseUrl());
    }

    return erfolg();
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      // Gleichzeitige doppelte Anmeldung: wie "bereits vorhanden" behandeln.
      return erfolg();
    }

    console.error("Waitlist POST error:", error);
    return NextResponse.json(
      { error: "Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es erneut." },
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
