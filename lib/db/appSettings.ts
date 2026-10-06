import { prisma } from "@/lib/prisma";

/**
 * Generischer Key/Value-Store für app-weite Laufzeit-Einstellungen (Tabelle
 * `app_settings`). Analog zum EmailTemplate.aktiv-Flag, aber nicht an ein
 * einzelnes Template gebunden – gedacht für Schalter, die im Admin umgelegt
 * werden, ohne Redeploy.
 */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

// ─── Teams-Aufnahme-Modus ────────────────────────────────────────────────────
// Entscheidet zur Laufzeit, ob neue Teilnehmer nativ (Microsoft Graph direkt aus
// der App, pro Klasse) oder über den bestehenden n8n-Workflow aufgenommen werden.
export const TEAMS_AUFNAHME_MODUS_KEY = "teams_aufnahme_modus";
export type TeamsAufnahmeModus = "nativ" | "n8n";

/**
 * Aktueller Modus. Default ohne gesetzten Wert ist BEWUSST "n8n", damit ein
 * Deployment das bestehende Verhalten nicht ändert – umgestellt wird erst aktiv
 * über den Schalter im Admin.
 */
export async function getTeamsAufnahmeModus(): Promise<TeamsAufnahmeModus> {
  const value = await getSetting(TEAMS_AUFNAHME_MODUS_KEY);
  return value === "nativ" ? "nativ" : "n8n";
}

export async function setTeamsAufnahmeModus(modus: TeamsAufnahmeModus): Promise<void> {
  await setSetting(TEAMS_AUFNAHME_MODUS_KEY, modus);
}

// ─── Allgemeines Teams-Team ─────────────────────────────────────────────────
// Klassenübergreifendes Team, in das jeder Teilnehmer zusätzlich zum Team seiner
// Klasse aufgenommen wird. Ohne Row gilt die Default-ID, ein leerer Wert schaltet
// die Aufnahme ab.
export const TEAMS_ALLGEMEIN_GROUP_ID_KEY = "teams_allgemein_group_id";
export const TEAMS_ALLGEMEIN_GROUP_ID_DEFAULT = "d815e6ce-8833-4629-b2da-153c44312acf";

export async function getTeamsAllgemeinGroupId(): Promise<string | null> {
  const value = await getSetting(TEAMS_ALLGEMEIN_GROUP_ID_KEY);
  if (value === null) return TEAMS_ALLGEMEIN_GROUP_ID_DEFAULT;
  return value.trim() || null;
}

export async function setTeamsAllgemeinGroupId(groupId: string): Promise<void> {
  await setSetting(TEAMS_ALLGEMEIN_GROUP_ID_KEY, groupId.trim());
}
