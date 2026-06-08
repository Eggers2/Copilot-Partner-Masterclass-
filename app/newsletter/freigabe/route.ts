import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNewsletter, readContent } from "@/lib/db/newsletters";
import { verifyToken } from "@/lib/newsletter/tokens";
import { htmlResponse, pageShell, submitButton } from "@/lib/newsletter/publicPage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Öffentliche, token-gesicherte Freigabe-Seite (kein Login). Aus der
 * Donnerstag-Benachrichtigung verlinkt.
 *
 * GET  rendert eine Bestätigungsseite mit Zusammenfassung + „Freigeben"-Button
 *      (bewusst KEIN Schreibzugriff auf GET → Link-Scanner/Prefetch können den
 *      Newsletter nicht versehentlich freigeben).
 * POST setzt DRAFT → APPROVED (nur dann) und bestätigt.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  const id = verifyToken("approve", token);
  if (!id) {
    return htmlResponse(
      400,
      pageShell({
        title: "Ungültiger Link",
        heading: "Link ungültig",
        body: "Dieser Freigabe-Link ist ungültig oder abgelaufen.",
        accent: "#FF6B6B",
      })
    );
  }

  const nl = await getNewsletter(id);
  if (!nl) {
    return htmlResponse(
      404,
      pageShell({
        title: "Nicht gefunden",
        heading: "Newsletter nicht gefunden",
        body: "Der zugehörige Newsletter existiert nicht mehr.",
        accent: "#FF6B6B",
      })
    );
  }

  if (nl.status === "SENT") {
    return htmlResponse(
      200,
      pageShell({
        title: "Bereits versendet",
        heading: `Newsletter #${nl.ausgabeNr} wurde bereits versendet`,
        body: "Hier ist nichts mehr zu tun.",
      })
    );
  }
  if (nl.status === "SENDING") {
    return htmlResponse(
      200,
      pageShell({
        title: "Versand läuft",
        heading: `Newsletter #${nl.ausgabeNr} wird gerade versendet`,
        body: "Der Versand läuft bereits.",
      })
    );
  }
  if (nl.status === "APPROVED") {
    return htmlResponse(
      200,
      pageShell({
        title: "Bereits freigegeben",
        heading: `Newsletter #${nl.ausgabeNr} ist freigegeben`,
        body: "Der Versand erfolgt automatisch am <strong>Freitag 09:00 Uhr</strong>.",
      })
    );
  }

  // DRAFT → Bestätigungsseite mit Zusammenfassung.
  const content = readContent(nl);
  const selected = content.selectedIds
    .map((sid) => content.candidates.find((c) => c.id === sid))
    .filter((c): c is NonNullable<typeof c> => !!c);
  const list =
    selected.length > 0
      ? `<ul style="margin:14px 0 0 0;padding-left:18px;color:#E8E8F0;font-size:14px;line-height:1.6;">${selected
          .map((s) => `<li>${escapeHtml(s.title)}</li>`)
          .join("")}</ul>`
      : `<p style="margin:14px 0 0 0;color:#F4B955;font-size:14px;">Achtung: Es sind noch keine News ausgewählt – im Editor prüfen.</p>`;

  const body = `
    Ausgabe <strong>#${nl.ausgabeNr}</strong> · KW ${nl.kw}/${nl.jahr} mit ${selected.length} ausgewählten News.
    ${list}
    <form method="POST" action="/newsletter/freigabe?token=${encodeURIComponent(token ?? "")}" style="margin-top:24px;">
      ${submitButton("✓ Für Freitag 09:00 Uhr freigeben")}
    </form>
    <div style="margin-top:16px;font-size:13px;"><a href="${baseFromReq(req)}/admin/newsletter/${nl.id}" style="color:#00C896;text-decoration:none;">Stattdessen im Editor öffnen &rarr;</a></div>
  `;

  return htmlResponse(
    200,
    pageShell({ title: "Newsletter freigeben", heading: `Newsletter #${nl.ausgabeNr} freigeben?`, body })
  );
}

export async function POST(req: NextRequest) {
  // Token bevorzugt aus der Query (Formular-Action trägt ihn dort), sonst Body.
  const url = new URL(req.url);
  let token = url.searchParams.get("token");
  if (!token) {
    try {
      const form = await req.formData();
      token = (form.get("token") as string | null) ?? null;
    } catch {
      // kein Formular-Body
    }
  }

  const id = verifyToken("approve", token);
  if (!id) {
    return htmlResponse(
      400,
      pageShell({
        title: "Ungültiger Link",
        heading: "Link ungültig",
        body: "Dieser Freigabe-Link ist ungültig oder abgelaufen.",
        accent: "#FF6B6B",
      })
    );
  }

  const nl = await getNewsletter(id);
  if (!nl) {
    return htmlResponse(404, pageShell({ title: "Nicht gefunden", heading: "Newsletter nicht gefunden", body: "—", accent: "#FF6B6B" }));
  }

  if (nl.status === "SENT" || nl.status === "SENDING") {
    return htmlResponse(
      200,
      pageShell({
        title: "Kein Zugriff",
        heading: `Newsletter #${nl.ausgabeNr} ist bereits im Versand`,
        body: "Eine Freigabe ist nicht mehr nötig.",
      })
    );
  }

  // Nur DRAFT → APPROVED (idempotent & race-sicher via updateMany).
  await prisma.newsletter.updateMany({
    where: { id, status: "DRAFT" },
    data: { status: "APPROVED", freigegebenAm: new Date() },
  });

  return htmlResponse(
    200,
    pageShell({
      title: "Freigegeben",
      heading: `Newsletter #${nl.ausgabeNr} freigegeben ✓`,
      body: "Der Versand erfolgt automatisch am <strong>Freitag 09:00 Uhr</strong>. Du kannst die Freigabe im Editor jederzeit zurückziehen.",
    })
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseFromReq(req: NextRequest): string {
  const env = process.env.APP_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}
