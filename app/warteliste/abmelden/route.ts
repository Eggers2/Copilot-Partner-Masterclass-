import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/newsletter/tokens";
import { htmlResponse, pageShell, submitButton } from "@/lib/newsletter/publicPage";
import { meldeVonSequenzAb } from "@/lib/followup/versand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Öffentliche, token-gesicherte Abmeldung von den Wartelisten-Mails
 * (Follow-up-Sequenz, lib/followup). Gleiches Muster wie
 * /newsletter/abmelden:
 *
 * GET  zeigt eine Bestätigungsseite mit Button (Link im Mail-Footer).
 * POST beendet die Sequenz, per Button oder als RFC-8058 One-Click.
 */
const UNGUELTIG = pageShell({
  title: "Ungültiger Link",
  heading: "Abmelde-Link ungültig",
  body: "Dieser Abmelde-Link ist ungültig. Schreib einfach an info@next-skills.de, dann nehmen wir dich raus.",
  accent: "#FF6B6B",
});

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!verifyToken("warteliste-abmelden", token)) return htmlResponse(400, UNGUELTIG);

  const body = `
    Möchtest du keine weiteren Mails zur Copilot Partner Masterclass bekommen?
    <form method="POST" action="/warteliste/abmelden?token=${encodeURIComponent(token ?? "")}" style="margin-top:24px;">
      ${submitButton("Ja, keine weiteren Mails", "#FF6B6B")}
    </form>
  `;
  return htmlResponse(
    200,
    pageShell({ title: "Abmelden", heading: "Keine weiteren Mails?", body, accent: "#FF6B6B" })
  );
}

export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  const leadId = verifyToken("warteliste-abmelden", token);
  if (!leadId) return htmlResponse(400, UNGUELTIG);

  const email = await meldeVonSequenzAb(leadId);
  if (!email) return htmlResponse(400, UNGUELTIG);

  return htmlResponse(
    200,
    pageShell({
      title: "Abgemeldet",
      heading: "Erledigt ✓",
      body: "Du bekommst keine weiteren Mails zur Masterclass. Wenn du später doch sprechen möchtest, antworte einfach auf eine meiner Mails.",
    })
  );
}
