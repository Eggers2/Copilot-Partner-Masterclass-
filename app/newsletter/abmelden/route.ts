import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/newsletter/tokens";
import { htmlResponse, pageShell, submitButton } from "@/lib/newsletter/publicPage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Öffentliche, token-gesicherte Abmeldung vom Newsletter.
 *
 * GET  zeigt eine Bestätigungsseite mit „Abmelden"-Button (Footer-Link).
 * POST meldet die Adresse ab – sowohl per Button als auch als RFC-8058
 *      One-Click (Header `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
 *      Token steckt dann in der Query der List-Unsubscribe-URL).
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  const email = verifyToken("unsub", token);
  if (!email) {
    return htmlResponse(
      400,
      pageShell({
        title: "Ungültiger Link",
        heading: "Abmelde-Link ungültig",
        body: "Dieser Abmelde-Link ist ungültig oder abgelaufen.",
        accent: "#FF6B6B",
      })
    );
  }

  const existing = await prisma.newsletterAbmeldung.findUnique({ where: { email } });
  if (existing) {
    return htmlResponse(
      200,
      pageShell({
        title: "Bereits abgemeldet",
        heading: "Du bist bereits abgemeldet",
        body: `<strong>${escapeHtml(email)}</strong> erhält keine weiteren Newsletter.`,
      })
    );
  }

  const body = `
    Möchtest du <strong>${escapeHtml(email)}</strong> vom Copilot-Insider-Newsletter abmelden?
    <form method="POST" action="/newsletter/abmelden?token=${encodeURIComponent(token ?? "")}" style="margin-top:24px;">
      ${submitButton("Ja, abmelden", "#FF6B6B")}
    </form>
  `;
  return htmlResponse(
    200,
    pageShell({ title: "Newsletter abmelden", heading: "Newsletter abmelden", body, accent: "#FF6B6B" })
  );
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  let token = url.searchParams.get("token");
  if (!token) {
    try {
      const form = await req.formData();
      token = (form.get("token") as string | null) ?? null;
    } catch {
      // kein Formular-Body (z.B. One-Click mit Token nur in der Query)
    }
  }

  const email = verifyToken("unsub", token);
  if (!email) {
    return htmlResponse(
      400,
      pageShell({
        title: "Ungültiger Link",
        heading: "Abmelde-Link ungültig",
        body: "Dieser Abmelde-Link ist ungültig oder abgelaufen.",
        accent: "#FF6B6B",
      })
    );
  }

  // Idempotent: mehrfaches Abmelden ist unschädlich.
  await prisma.newsletterAbmeldung.upsert({
    where: { email },
    create: { email },
    update: {},
  });

  return htmlResponse(
    200,
    pageShell({
      title: "Abgemeldet",
      heading: "Erfolgreich abgemeldet ✓",
      body: `<strong>${escapeHtml(email)}</strong> erhält keine weiteren Newsletter. Schade, dass du gehst!`,
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
