import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeamsAufnahmeModus } from "@/lib/db/appSettings";
import { isGraphConfigured, inviteGuestToTeam } from "@/lib/teams/graph";
import { fireTeamsGuestWebhook } from "@/lib/webhooks/teamsGuest";

export interface TeamsInviteParticipant {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
}

export interface TeamsInviteKlasse {
  id: string;
  name: string;
  teamsGroupId: string | null;
}

function displayNameOf(p: TeamsInviteParticipant): string {
  return `${p.vorname} ${p.nachname}`.trim() || p.email;
}

function inviteRedirectUrl(): string {
  return process.env.APP_BASE_URL ?? "https://www.copilotberater.de";
}

/**
 * Zentrale Weiche für die Teams-Gast-Aufnahme. Entscheidet anhand des im Admin
 * umlegbaren Schalters (`teams_aufnahme_modus`), ob nativ über Microsoft Graph
 * (pro Klasse) oder über den bestehenden n8n-Workflow aufgenommen wird.
 *
 * - Default/Fallback ist n8n – ein Deployment ändert das Verhalten also nicht.
 * - Im Native-Modus gibt es bewusst KEINEN stillen Rückfall auf n8n: das würde
 *   ins (falsche) n8n-Einzel-Team einladen. Schlägt ein Invite fehl, bleibt
 *   `teams_eingeladen_am` null und der nächste Speichervorgang versucht es erneut.
 */
export async function dispatchTeamsGuestInvites(input: {
  participants: TeamsInviteParticipant[];
  klasse: TeamsInviteKlasse;
  bestellNr: string;
}): Promise<void> {
  const { participants, klasse, bestellNr } = input;
  if (participants.length === 0) return;

  const modus = await getTeamsAufnahmeModus();

  if (modus === "nativ" && isGraphConfigured()) {
    const groupId = klasse.teamsGroupId;
    if (!groupId) {
      console.error(
        `[Teams] Native-Modus aktiv, aber Klasse "${klasse.name}" (${klasse.id}) hat keine teamsGroupId – ` +
          `${participants.length} Teilnehmer übersprungen. Bitte die Group-ID der Klasse im Admin hinterlegen.`
      );
      return;
    }

    const redirectUrl = inviteRedirectUrl();
    // Nach der Response ausführen, damit das Speichern nicht blockiert wird.
    after(async () => {
      for (const p of participants) {
        try {
          await inviteGuestToTeam({
            email: p.email,
            displayName: displayNameOf(p),
            teamsGroupId: groupId,
            redirectUrl,
          });
          await prisma.bestellungTeilnehmer.update({
            where: { id: p.id },
            data: { teamsEingeladenAm: new Date() },
          });
        } catch (err) {
          console.error(
            `[Teams] Native Aufnahme fehlgeschlagen für ${p.email} (Klasse ${klasse.name}):`,
            err
          );
        }
      }
    });
    return;
  }

  // Fallback / Default: bestehender n8n-Webhook. n8n setzt teams_eingeladen_am
  // anschließend per Callback an /api/webhooks/n8n.
  for (const p of participants) {
    fireTeamsGuestWebhook({
      teilnehmerId: p.id,
      bestellNr,
      vorname: p.vorname,
      nachname: p.nachname,
      email: p.email,
    });
  }
}
