/**
 * Reine Hilfsfunktionen für die Teilnehmer-Werkzeuge (teilnehmer_suchen,
 * klassen_teilnehmer, bestellungen_suchen). Ohne Datenbankzugriff, damit sie
 * sich in tests/mcp-teilnehmer.test.ts direkt prüfen lassen.
 */

export interface TeilnehmerZeile {
  vorname: string;
  nachname: string;
  email: string;
}

/** Leere Slots (ohne E-Mail) gelten nicht als gemeldete Teilnehmer. */
export function istGemeldet(t: Pick<TeilnehmerZeile, "email">): boolean {
  return t.email.trim().length > 0;
}

/**
 * Zerlegt die Suche in Wörter. Jedes Wort muss in Vorname, Nachname oder
 * E-Mail vorkommen, damit auch "Christopher Frank" als ganzer Name trifft.
 */
export function sucheWoerter(suche: string): string[] {
  return suche
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/** Prisma-Filter für BestellungTeilnehmer zur Freitextsuche. */
export function teilnehmerSucheWhere(suche: string) {
  return {
    AND: sucheWoerter(suche).map((wort) => ({
      OR: [
        { vorname: { contains: wort, mode: "insensitive" as const } },
        { nachname: { contains: wort, mode: "insensitive" as const } },
        { email: { contains: wort, mode: "insensitive" as const } },
      ],
    })),
  };
}

/** Gleiche Logik wie teilnehmerSucheWhere, für die Prüfung im Speicher. */
export function teilnehmerPasstZurSuche(t: TeilnehmerZeile, suche: string): boolean {
  const felder = [t.vorname, t.nachname, t.email].map((f) => f.toLowerCase());
  return sucheWoerter(suche).every((wort) => felder.some((f) => f.includes(wort)));
}

/** "@Acp.de " → "acp.de". */
export function normalisiereDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@+/, "");
}

/** Teil nach dem letzten @, klein geschrieben. Ohne @ leerer String. */
export function emailDomain(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  return at === -1 ? "" : e.slice(at + 1);
}

/**
 * Domain-Abgleich: exakt auf den Teil nach dem @. Subdomains zählen dazu,
 * "einsnulleins.de" findet also auch "muenchen.einsnulleins.de", aber nicht
 * "xeinsnulleins.de". Wer gezielt eine Subdomain angibt, bekommt nur diese.
 */
export function domainPasst(email: string, domain: string): boolean {
  const d = normalisiereDomain(domain);
  if (!d) return false;
  const ed = emailDomain(email);
  return ed === d || ed.endsWith(`.${d}`);
}

/** Prisma-Vorfilter für domainPasst (die genaue Prüfung folgt im Speicher). */
export function teilnehmerDomainWhere(domain: string) {
  const d = normalisiereDomain(domain);
  return {
    OR: [
      { email: { endsWith: `@${d}`, mode: "insensitive" as const } },
      { email: { endsWith: `.${d}`, mode: "insensitive" as const } },
    ],
  };
}

export interface BestellungFuerZusammenfassung {
  userAnzahl: number;
  intern: boolean;
  teilnehmer: Pick<TeilnehmerZeile, "email">[];
}

export interface KlassenZusammenfassung {
  bestellungen: number;
  gebuchtePlaetze: number;
  gemeldeteTeilnehmer: number;
  freieSlots: number;
  interneBestellungen: number;
  interneTeilnehmer: number;
}

/**
 * Zusammenfassung je Klasse. Wie in klassen_liste zählen interne Bestellungen
 * nicht zu Bestellungen und gebuchten Plätzen; sie stehen separat. Freie Slots
 * werden je Bestellung gerechnet (gebuchte Plätze minus gemeldete, mindestens 0),
 * damit eine überbuchte Bestellung keine freien Plätze einer anderen verdeckt.
 */
export function klassenZusammenfassung(
  bestellungen: BestellungFuerZusammenfassung[]
): KlassenZusammenfassung {
  const z: KlassenZusammenfassung = {
    bestellungen: 0,
    gebuchtePlaetze: 0,
    gemeldeteTeilnehmer: 0,
    freieSlots: 0,
    interneBestellungen: 0,
    interneTeilnehmer: 0,
  };
  for (const b of bestellungen) {
    const gemeldet = b.teilnehmer.filter(istGemeldet).length;
    if (b.intern) {
      z.interneBestellungen += 1;
      z.interneTeilnehmer += gemeldet;
      continue;
    }
    z.bestellungen += 1;
    z.gebuchtePlaetze += b.userAnzahl;
    z.gemeldeteTeilnehmer += gemeldet;
    z.freieSlots += Math.max(0, b.userAnzahl - gemeldet);
  }
  return z;
}
