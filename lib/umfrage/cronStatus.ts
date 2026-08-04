import { getSetting, setSetting } from "@/lib/db/appSettings";

/**
 * Sichtbarkeit des Umfrage-Crons im Admin: der Endpoint meldet jeden
 * autorisierten Aufruf (Ping = "GitHub Actions lebt") und jeden echten
 * 08:00-Lauf mit Ergebnis. Die Umfragen-Übersicht zeigt beides an und warnt,
 * wenn der letzte Ping zu lange her ist.
 */

const PING_KEY = "umfrage_cron_ping";
const LAUF_KEY = "umfrage_cron_lauf";

/** Der Workflow feuert täglich im 08:00-Fenster; nach 26h ohne Ping stimmt etwas nicht. */
export const CRON_PING_WARNUNG_MS = 26 * 60 * 60 * 1000;

export interface UmfrageCronLauf {
  zeit: string; // ISO
  erinnerungenRunden: number;
  erinnerungenMails: number;
  lieferrisikoRunden: number;
  lieferrisikoMails: number;
}

/** Jeder autorisierte Aufruf des Endpoints, auch außerhalb der Zielstunde. */
export async function meldeCronPing(): Promise<void> {
  await setSetting(PING_KEY, new Date().toISOString());
}

/** Nur echte Läufe (Zielstunde bzw. force): Zeitpunkt + Ergebnis-Zusammenfassung. */
export async function meldeCronLauf(lauf: UmfrageCronLauf): Promise<void> {
  await setSetting(LAUF_KEY, JSON.stringify(lauf));
}

export interface UmfrageCronStatus {
  ping: Date | null;
  pingVeraltet: boolean;
  lauf: UmfrageCronLauf | null;
}

export async function getUmfrageCronStatus(): Promise<UmfrageCronStatus> {
  const [pingRaw, laufRaw] = await Promise.all([getSetting(PING_KEY), getSetting(LAUF_KEY)]);

  let ping: Date | null = null;
  if (pingRaw) {
    const d = new Date(pingRaw);
    if (!Number.isNaN(d.getTime())) ping = d;
  }

  let lauf: UmfrageCronLauf | null = null;
  if (laufRaw) {
    try {
      lauf = JSON.parse(laufRaw) as UmfrageCronLauf;
    } catch {
      lauf = null;
    }
  }

  return {
    ping,
    pingVeraltet: !ping || Date.now() - ping.getTime() > CRON_PING_WARNUNG_MS,
    lauf,
  };
}
