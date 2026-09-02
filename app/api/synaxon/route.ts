import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildSynaxonQuelle, parseSynaxonSrc } from "@/lib/synaxon/source";
import { notifySynaxonLead, sendSynaxonConfirmation } from "@/lib/synaxon/notify";

// Unterlagen-Anfrage der SYNAXON-Landingpage (/synaxon).
//
// Legt einen Lead mit Status NEW (Default, wie die Warteliste) und Quelle
// SYNAXON an. Existiert die E-Mail bereits, wird der bestehende Lead nur
// ergänzt (leere Felder nachgetragen, Aktivität angehängt), Status und
// ursprüngliche Quelle bleiben unverändert. Danach Benachrichtigung an
// info@next-skills.de (Resend, Fallback n8n).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ValidationError extends Error {}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

interface SynaxonInput {
  name: string;
  firma: string;
  email: string;
  telefon: string;
  nachricht: string;
  src: string | null;
  referrer: string | null;
}

function validate(body: Record<string, unknown>): SynaxonInput {
  const name = text(body.name, 120);
  if (name.length < 2) throw new ValidationError("Bitte gib deinen Namen an.");

  const firma = text(body.firma, 160);
  if (firma.length < 2) throw new ValidationError("Bitte gib den Namen deines Systemhauses an.");

  const email = text(body.email, 254).toLowerCase();
  if (!EMAIL_REGEX.test(email)) throw new ValidationError("Bitte gib eine gültige E-Mail-Adresse ein.");

  const telefon = text(body.telefon, 60);

  const nachricht = text(body.nachricht, 1000);

  if (body.consent !== true) {
    throw new ValidationError("Bitte bestätige die Datenschutzhinweise.");
  }

  // Ungültige Kennungen werden still verworfen, nicht abgewiesen: der Lead
  // ist wichtiger als der Herkunftswert.
  const src = parseSynaxonSrc(body.src);
  const referrer = text(body.referrer, 500) || null;

  return { name, firma, email, telefon, nachricht, src, referrer };
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

    if (!checkRateLimit(`synaxon:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuche es später noch einmal." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Honeypot: Bots füllen das unsichtbare Feld aus. Still bestätigen, nichts speichern.
    if (typeof body.website === "string" && body.website.trim().length > 0) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const input = validate(body);
    const quelle = buildSynaxonQuelle(input.src);
    const landingPage = input.src ? `/synaxon?src=${input.src}` : "/synaxon";
    const aktivitaet =
      `Unterlagen über /synaxon angefordert (Quelle: ${quelle}).` +
      (input.nachricht ? `\n\nWorum geht es?\n${input.nachricht}` : "");

    let leadId: string;
    let bestehenderLead = false;

    const existing = await prisma.lead.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, company: true, phone: true, notes: true },
    });

    if (existing) {
      bestehenderLead = true;
      leadId = existing.id;
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          name: existing.name || input.name,
          company: existing.company || input.firma,
          phone: existing.phone || (input.telefon || null),
          notes:
            input.nachricht && !existing.notes ? input.nachricht : existing.notes,
        },
      });
    } else {
      try {
        const created = await prisma.lead.create({
          data: {
            email: input.email,
            name: input.name,
            company: input.firma,
            phone: input.telefon || null,
            notes: input.nachricht || null,
            source: "SYNAXON",
            utmSource: "synaxon",
            utmCampaign: quelle,
            referrer: input.referrer,
            landingPage,
            firstTouchAt: new Date(),
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
      data: { leadId, type: "NOTE", content: aktivitaet },
    });

    // Mails fire-and-forget, damit der Besucher nicht auf den Versand wartet:
    // interne Benachrichtigung und Eingangsbestätigung an den Absender.
    const mailInput = {
      leadId,
      name: input.name,
      firma: input.firma,
      email: input.email,
      telefon: input.telefon,
      nachricht: input.nachricht,
      quelle,
      bestehenderLead,
    };
    notifySynaxonLead(mailInput).catch((err) =>
      console.error("[synaxon] Benachrichtigung fehlgeschlagen:", err)
    );
    sendSynaxonConfirmation(mailInput).catch((err) =>
      console.error("[synaxon] Bestätigung fehlgeschlagen:", err)
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Synaxon POST error:", error);
    return NextResponse.json(
      { error: "Da ist etwas schiefgelaufen. Bitte versuche es noch einmal oder schreib an info@next-skills.de." },
      { status: 500 }
    );
  }
}
