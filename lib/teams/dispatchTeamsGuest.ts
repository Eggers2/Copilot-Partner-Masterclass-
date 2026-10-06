import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeamsAllgemeinGroupId, getTeamsAufnahmeModus } from "@/lib/db/appSettings";
import { isGraphConfigured, inviteGuestToTeam } from "@/lib/teams/graph";
import { inviteInsAllgemeineTeam, inviteRedirectUrl } from "@/lib/teams/allgemeinesTeam";
import { sendTeamsAufnahmeEmail } from "@/lib/email/sendTeamsAufnahme";
import { fireTeamsGuestWebhook } from "@/lib/webhooks/teamsGuest";

export interface TeamsInviteParticipant {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  // null = noch offen. Das Klassen-Team und das allgemeine Team werden getrennt
  // nachgehalten, damit ein Fehlschlag beim einen das andere nicht blockiert.
  teamsEingeladenAm: Date | null;
  teamsAllgemeinEingeladenAm: Date | null;
}

export interface TeamsInviteKlasse {
  id: string;
  name: string;
  teamsGroupId: string | null;
}

function displayNameOf(p: TeamsInviteParticipant): string {
  return `${p.vorname} ${p.nachname}`.trim() || p.email;
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
 * - Zusätzlich kommt jeder Teilnehmer ins allgemeine Team (Group-ID in den
 *   App-Settings). Das läuft unabhängig vom Modus nativ, immer NACH dem
 *   Klassen-Team, damit die Microsoft-Einladungsmail aus dem Klassen-Schritt
 *   kommt und das allgemeine Team keine zweite auslöst.
 */
export async function dispatchTeamsGuestInvites(input: {
  participants: TeamsInviteParticipant[];
  klasse: TeamsInviteKlasse;
  bestellNr: string;
}): Promise<void> {
  const { participants, klasse, bestellNr } = input;
  if (participants.length === 0) return;

  const modus = await getTeamsAufnahmeModus();
  const graph = isGraphConfigured();
  const allgemeinGroupId = graph ? await getTeamsAllgemeinGroupId() : null;

  if (modus === "nativ" && graph) {
    const groupId = klasse.teamsGroupId;
    if (!groupId) {
      console.error(
        `[Teams] Native-Modus aktiv, aber Klasse "${klasse.name}" (${klasse.id}) hat keine teamsGroupId – ` +
          `Klassen-Team für ${participants.length} Teilnehmer übersprungen. Bitte die Group-ID der Klasse im Admin hinterlegen.`
      );
    }

    // Nach der Response ausführen, damit das Speichern nicht blockiert wird.
    after(async () => {
      for (const p of participants) {
        if (groupId && !p.teamsEingeladenAm) {
          await insKlassenTeam(p, klasse.name, groupId);
        }
        if (allgemeinGroupId) await insAllgemeineTeam(p, allgemeinGroupId);
      }
    });
    return;
  }

  // Fallback / Default: bestehender n8n-Webhook. n8n setzt teams_eingeladen_am
  // anschließend per Callback an /api/webhooks/n8n.
  for (const p of participants) {
    if (p.teamsEingeladenAm) continue;
    fireTeamsGuestWebhook({
      teilnehmerId: p.id,
      bestellNr,
      vorname: p.vorname,
      nachname: p.nachname,
      email: p.email,
    });
  }
  if (allgemeinGroupId) {
    after(async () => {
      for (const p of participants) await insAllgemeineTeam(p, allgemeinGroupId);
    });
  }
}

async function insKlassenTeam(
  p: TeamsInviteParticipant,
  klasseName: string,
  groupId: string
): Promise<void> {
  try {
    await inviteGuestToTeam({
      email: p.email,
      displayName: displayNameOf(p),
      teamsGroupId: groupId,
      redirectUrl: inviteRedirectUrl(),
    });
    await prisma.bestellungTeilnehmer.update({
      where: { id: p.id },
      data: { teamsEingeladenAm: new Date() },
    });
    // Eigene Benachrichtigung – Microsoft schickt bei Gruppen-Aufnahme keine.
    await sendTeamsAufnahmeEmail({
      email: p.email,
      vorname: p.vorname,
      klasseName,
    });
  } catch (err) {
    console.error(
      `[Teams] Native Aufnahme fehlgeschlagen für ${p.email} (Klasse ${klasseName}):`,
      err
    );
  }
}

async function insAllgemeineTeam(
  p: TeamsInviteParticipant,
  groupId: string
): Promise<void> {
  if (p.teamsAllgemeinEingeladenAm) return;
  try {
    await inviteInsAllgemeineTeam({
      teilnehmerIds: [p.id],
      email: p.email,
      displayName: displayNameOf(p),
      groupId,
    });
  } catch (err) {
    console.error(`[Teams] Aufnahme ins allgemeine Team fehlgeschlagen für ${p.email}:`, err);
  }
}
