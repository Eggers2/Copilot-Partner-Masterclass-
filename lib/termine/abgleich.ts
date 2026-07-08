// Intelligenter Abgleich zwischen den Anwesenden aus dem Teams-Bericht und
// der Teilnehmerübersicht der Klasse. Reines Modul ohne Server-Imports.
//
// Ein exakter E-Mail-Vergleich reicht in der Praxis nicht: Teams meldet oft
// eine andere Adresse derselben Person (z.B. "worsch@goserver.de" statt
// "d.worsch@goserver.de") oder eine Adresse einer Schwester-Domain. Daher
// wird in dieser Reihenfolge gematcht:
//   1. Ignorierliste (Moderatoren/Sponsoren, per E-Mail) → "ignoriert"
//   2. exakte E-Mail (Teilnehmer oder Besteller-Kontakt) → "registriert"
//   3. Name (normalisiert: "Nachname, Vorname (Extern)" = "Vorname Nachname",
//      Umlaute/Akzente egal, zweiter Vorname erlaubt) → "registriert"
//   4. E-Mail-Heuristik: gleiche Domain + gleicher Kern des Local-Parts
//      (letztes Segment, i.d.R. der Nachname: "d.worsch" ≙ "worsch")
//   5. sonst → "unbekannt"

export type AbgleichStatus = "registriert" | "unbekannt" | "ignoriert";

export interface RegistrierterTeilnehmer {
  vorname: string;
  nachname: string;
  /** Normalisierte E-Mail (lowercase), nicht leer. */
  email: string;
}

export interface AbgleichTreffer {
  status: AbgleichStatus;
  /**
   * Kanonische E-Mail des gematchten registrierten Teilnehmers – darüber wird
   * die Anwesenheit in der Rangliste der richtigen Person gutgeschrieben,
   * auch wenn Teams eine abweichende Adresse geliefert hat.
   */
  teilnehmerEmail?: string;
}

function stripDiacritics(s: string): string {
  return (
    s
      // Deutsche Umlaute nach Konvention transliterieren, damit "Müller" und
      // die getippte Form "Mueller" identisch werden.
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  );
}

/** "Worsch, Dominik (Extern)" → ["worsch", "dominik"] */
export function nameTokens(raw: string): string[] {
  const clean = stripDiacritics(raw.toLowerCase())
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return clean ? clean.split(/\s+/) : [];
}

/**
 * Namen gelten als gleich, wenn sie mindestens zwei gemeinsame Tokens haben
 * (Vor- + Nachname) und eine Seite vollständig in der anderen enthalten ist
 * (zweiter Vorname o.Ä. stört nicht). Einzelne Tokens ("Cafeteria") matchen
 * bewusst nie.
 */
function tokensMatch(a: string[], b: string[]): boolean {
  if (a.length < 2 && b.length < 2) return false;
  const setA = new Set(a);
  const setB = new Set(b);
  let common = 0;
  for (const t of setA) if (setB.has(t)) common++;
  if (common < 2) return false;
  return a.every((t) => setB.has(t)) || b.every((t) => setA.has(t));
}

/** "d.worsch@goserver.de" → { domain: "goserver.de", kern: "worsch" } */
function emailKern(email: string): { domain: string; kern: string } | null {
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  const segmente = stripDiacritics(local.toLowerCase())
    .split(/[._-]+/)
    .filter(Boolean);
  const kern = segmente[segmente.length - 1] ?? "";
  // Zu kurze Kerne (Initialen) wären zu treffsicher für Fehlalarme.
  if (kern.length < 3) return null;
  return { domain: domain.toLowerCase(), kern };
}

export interface TeilnehmerAbgleich {
  match(name: string, email: string): AbgleichTreffer;
}

export function createTeilnehmerAbgleich(opts: {
  registrierte: RegistrierterTeilnehmer[];
  /** Weitere erlaubte Adressen (Besteller-Kontakte) – zählen als bekannt. */
  weitereBekannteEmails?: string[];
  /** Moderatoren/Sponsoren, die nicht als Abweichung gemeldet werden sollen. */
  ignorierteEmails?: string[];
}): TeilnehmerAbgleich {
  const registrierte = opts.registrierte.map((r) => ({
    email: r.email,
    tokens: nameTokens(`${r.vorname} ${r.nachname}`),
    kern: emailKern(r.email),
  }));
  const byEmail = new Map(registrierte.map((r) => [r.email, r]));
  const weitere = new Set(opts.weitereBekannteEmails ?? []);
  const ignoriert = new Set(
    (opts.ignorierteEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean)
  );

  return {
    match(name: string, email: string): AbgleichTreffer {
      if (email && ignoriert.has(email)) return { status: "ignoriert" };

      if (email) {
        const exakt = byEmail.get(email);
        if (exakt) return { status: "registriert", teilnehmerEmail: exakt.email };
        if (weitere.has(email)) return { status: "registriert" };
      }

      const tokens = nameTokens(name);
      if (tokens.length > 0) {
        const treffer = registrierte.find((r) => tokensMatch(tokens, r.tokens));
        if (treffer) {
          return { status: "registriert", teilnehmerEmail: treffer.email };
        }
      }

      if (email) {
        const kern = emailKern(email);
        if (kern) {
          const treffer = registrierte.find(
            (r) =>
              r.kern && r.kern.domain === kern.domain && r.kern.kern === kern.kern
          );
          if (treffer) {
            return { status: "registriert", teilnehmerEmail: treffer.email };
          }
        }
      }

      return { status: "unbekannt" };
    },
  };
}
