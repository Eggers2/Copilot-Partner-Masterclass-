import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import {
  bestaetigungUeberApp,
  sendeWartelisteBestaetigung,
  sequenzStartDaten,
} from "@/lib/followup/versand";
import { sperreMails } from "@/lib/leads/keineMails";
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
// Nur neue Leads mit Marketing-Einwilligung kommen in die Wartelisten-
// Sequenz (Bestätigung plus vier Follow-ups). Ohne Einwilligung geht keine
// Mail an den Lead.

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
    let bestehenderLead = false;

    const existing = await prisma.lead.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, company: true },
    });

    if (existing) {
      bestehenderLead = true;
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
            // Wartelisten-Sequenz (vier Follow-up-Mails) nur mit Einwilligung.
            ...(input.marketingConsent ? sequenzStartDaten() : {}),
          },
          select: { id: true },
        });
        leadId = created.id;
      } catch (error) {
        // Zwei Absendungen gleichzeitig: der zweite Versuch ergänzt den ersten.
        if (!isUniqueViolation(error)) throw error;
        const raced = await prisma.lead.findUnique({
          where: { email: input.email },
          select: { id: true },
        });
        if (!raced) throw error;
        leadId = raced.id;
        bestehenderLead = true;
      }
    }

    await prisma.leadActivity.create({
      data: { leadId, type: "NOTE", content: notiz },
    });

    // Mails an den Lead nur mit Marketing-Einwilligung und nur bei neuen
    // Leads: Bestätigung wie bei /api/waitlist, über Resend oder, solange die
    // Vorlage inaktiv ist, über den n8n-Workflow "EMail Masterclass". Der
    // Workflow schickt die Wartelisten-Bestätigung an jeden übergebenen
    // Kontakt, deshalb wird er ohne Einwilligung nicht aufgerufen.
    // Neuer Lead ohne Einwilligung: als "Keine E-Mails" markieren, damit
    // auch keine manuelle Mail rausgeht.
    if (!input.marketingConsent && !bestehenderLead) {
      await sperreMails(leadId, "Keine Marketing-Einwilligung (ADN Schweiz, 28.10.2026)");
    }

    if (input.marketingConsent && !bestehenderLead) {
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      if (await bestaetigungUeberApp().catch(() => false)) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (lead) await sendeWartelisteBestaetigung(lead, await resolveAppBaseUrl());
      } else if (webhookUrl) {
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: input.email,
            timestamp: new Date().toISOString(),
            entryId: leadId,
            source: "EVENT",
            marketing_consent: true,
            existing_lead: false,
          }),
        })
          .then((res) => {
            if (!res.ok) console.error(`N8N webhook returned ${res.status}`);
          })
          .catch((err) => console.error("N8N webhook delivery failed:", err));
      }
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
