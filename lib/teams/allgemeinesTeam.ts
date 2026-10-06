import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeamsAllgemeinGroupId } from "@/lib/db/appSettings";
import { isGraphConfigured, inviteGuestToTeam } from "@/lib/teams/graph";

/**
 * Aufnahme in das klassenübergreifende allgemeine Teams-Team. Läuft immer nativ
 * über Microsoft Graph und zusätzlich zum Klassen-Team (siehe
 * lib/teams/dispatchTeamsGuest.ts).
 *
 * Bewusst OHNE Microsoft-Einladungsmail und ohne eigene Benachrichtigung: die
 * Person ist über ihr Klassen-Team bereits Gast, das Team taucht einfach in
 * Teams auf.
 */

export function inviteRedirectUrl(): string {
  return process.env.APP_BASE_URL ?? "https://www.copilotberater.de";
}

/**
 * Nimmt eine Adresse ins allgemeine Team auf und markiert alle übergebenen
 * Teilnehmer-Zeilen (dieselbe Adresse kann in mehreren Bestellungen stehen).
 * Wirft bei Fehlern, damit der Aufrufer loggen und weitermachen kann.
 */
export async function inviteInsAllgemeineTeam(input: {
  teilnehmerIds: number[];
  email: string;
  displayName: string;
  groupId: string;
}): Promise<void> {
  await inviteGuestToTeam({
    email: input.email,
    displayName: input.displayName,
    teamsGroupId: input.groupId,
    redirectUrl: inviteRedirectUrl(),
    sendInvitationMessage: false,
  });
  await prisma.bestellungTeilnehmer.updateMany({
    where: { id: { in: input.teilnehmerIds } },
    data: { teamsAllgemeinEingeladenAm: new Date() },
  });
}

// ─── Einmalige Aufnahme des Bestands per Button ──────────────────────────────

/** Teilnehmer, die noch nicht im allgemeinen Team sind (ohne entzogene Zugänge). */
const OFFEN_WHERE = {
  teamsAllgemeinEingeladenAm: null,
  NOT: [{ email: "" }, { ablefyState: "STORNIERT" as const }],
};

// Modul-lokal: verhindert, dass ein Doppelklick zwei Läufe parallel startet.
let laufAktiv = false;

export function isBestandsaufnahmeAktiv(): boolean {
  return laufAktiv;
}

export async function getAllgemeinStatus(): Promise<{
  offenAdressen: number;
  aufgenommenAdressen: number;
}> {
  const [offen, aufgenommen] = await Promise.all([
    prisma.bestellungTeilnehmer.findMany({
      where: OFFEN_WHERE,
      select: { email: true },
      distinct: ["email"],
    }),
    prisma.bestellungTeilnehmer.findMany({
      where: { teamsAllgemeinEingeladenAm: { not: null }, NOT: { email: "" } },
      select: { email: true },
      distinct: ["email"],
    }),
  ]);
  const aufgenommenSet = new Set(aufgenommen.map((t) => t.email));
  return {
    // Eine Adresse, die in einer Bestellung schon drin ist, zählt nicht als offen.
    offenAdressen: offen.filter((t) => !aufgenommenSet.has(t.email)).length,
    aufgenommenAdressen: aufgenommenSet.size,
  };
}

/**
 * Startet die Aufnahme aller bisherigen Teilnehmer im Hintergrund. Idempotent:
 * bereits aufgenommene werden übersprungen, ein erneuter Start holt nur die
 * Fehlschläge nach. Gibt die Zahl der offenen Adressen zurück.
 */
export async function starteBestandsaufnahmeAllgemein(): Promise<
  { ok: true; adressen: number } | { ok: false; error: string }
> {
  if (!isGraphConfigured()) {
    return { ok: false, error: "Microsoft Graph ist nicht konfiguriert (MS_GRAPH_*)." };
  }
  const groupId = await getTeamsAllgemeinGroupId();
  if (!groupId) {
    return { ok: false, error: "Für das allgemeine Team ist keine Group-ID hinterlegt." };
  }
  if (laufAktiv) {
    return { ok: false, error: "Die Aufnahme läuft bereits. Bitte warten und die Seite neu laden." };
  }

  const offen = await prisma.bestellungTeilnehmer.findMany({
    where: OFFEN_WHERE,
    select: { id: true, vorname: true, nachname: true, email: true },
    orderBy: { id: "asc" },
  });
  const bereitsDrin = new Set(
    (
      await prisma.bestellungTeilnehmer.findMany({
        where: { teamsAllgemeinEingeladenAm: { not: null }, NOT: { email: "" } },
        select: { email: true },
        distinct: ["email"],
      })
    ).map((t) => t.email)
  );

  // Pro Adresse nur ein Graph-Aufruf, markiert werden alle Zeilen der Adresse.
  const proAdresse = new Map<string, { ids: number[]; displayName: string }>();
  for (const t of offen) {
    const eintrag = proAdresse.get(t.email);
    if (eintrag) {
      eintrag.ids.push(t.id);
    } else {
      proAdresse.set(t.email, {
        ids: [t.id],
        displayName: `${t.vorname} ${t.nachname}`.trim() || t.email,
      });
    }
  }

  // Adressen, die über eine andere Bestellung schon im Team sind, nur markieren.
  const nurMarkieren = [...proAdresse].filter(([email]) => bereitsDrin.has(email));
  if (nurMarkieren.length > 0) {
    await prisma.bestellungTeilnehmer.updateMany({
      where: { id: { in: nurMarkieren.flatMap(([, e]) => e.ids) } },
      data: { teamsAllgemeinEingeladenAm: new Date() },
    });
  }
  const aufzunehmen = [...proAdresse].filter(([email]) => !bereitsDrin.has(email));
  if (aufzunehmen.length === 0) return { ok: true, adressen: 0 };

  laufAktiv = true;
  after(async () => {
    let erfolgreich = 0;
    let fehlgeschlagen = 0;
    try {
      for (const [email, { ids, displayName }] of aufzunehmen) {
        try {
          await inviteInsAllgemeineTeam({ teilnehmerIds: ids, email, displayName, groupId });
          erfolgreich++;
        } catch (err) {
          fehlgeschlagen++;
          console.error(`[Teams] Aufnahme ins allgemeine Team fehlgeschlagen für ${email}:`, err);
        }
        // Kurze Pause, damit Graph bei mehreren hundert Adressen nicht drosselt.
        await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      laufAktiv = false;
      console.log(
        `[Teams] Bestandsaufnahme allgemeines Team beendet: ${erfolgreich} aufgenommen, ${fehlgeschlagen} fehlgeschlagen.`
      );
    }
  });

  return { ok: true, adressen: aufzunehmen.length };
}
