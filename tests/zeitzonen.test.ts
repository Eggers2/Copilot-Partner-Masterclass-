/**
 * Nagelt den Zeitzonen-Bug fest.
 *
 *   npm test
 *
 * Die Tests laufen bewusst gegen die echten Schreib- und Lesepfade, nicht
 * gegen nachgebaute Logik:
 *
 *   Admin-UI schreibt   berlinInputToUtc()      (app/admin/actions.ts)
 *   MCP schreibt        parseFollowUp()         (lib/mcp/tools/schreiben.ts)
 *   Admin-UI liest      formatBerlinDateTime()  (LeadsTable, FollowUpWidget)
 *                       utcToBerlinInput()      (LeadDetailPanel, Formularfeld)
 *   MCP liest           formatBerlinDateTime()  (followUpLokal, Bestätigungstext)
 *
 * Geprüft wird über beide Wege, an einem Sommertermin, einem Wintertermin und
 * an beiden Umstellungstagen. Wer einen Pfad wieder auf `new Date(local)` oder
 * `toISOString().slice(0,16)` umstellt, macht diese Datei rot.
 *
 * Wichtig: Diese Tests müssen auch dann grün sein, wenn der Prozess NICHT in
 * UTC läuft. Genau diese Abhängigkeit war die Ursache des Bugs.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  berlinInputToUtc,
  formatBerlinDateTime,
  isBerlinDstGap,
  migrationWouldShiftDisplay,
  naiveReading,
  reinterpretNaiveAsBerlin,
  utcToBerlinInput,
} from "@/lib/datetime";
import { parseFollowUp } from "@/lib/mcp/tools/schreiben";

/** Termin, wie ihn ein Mensch in Deutschland nennt. */
interface Termin {
  name: string;
  lokal: string; // was im Formular steht bzw. dem MCP gesagt wird
  utc: string; // was in der Datenbank stehen muss
  anzeige: string; // was das Portal zeigen muss
}

const TERMINE: Termin[] = [
  {
    name: "Sommer (CEST, +02:00) – der Fall aus dem Ticket",
    lokal: "2026-09-16T11:30",
    utc: "2026-09-16T09:30:00.000Z",
    anzeige: "16.09.2026, 11:30",
  },
  {
    name: "Winter (CET, +01:00)",
    lokal: "2026-01-15T11:30",
    utc: "2026-01-15T10:30:00.000Z",
    anzeige: "15.01.2026, 11:30",
  },
  {
    name: "Umstellungstag Frühjahr, vor dem Sprung",
    lokal: "2026-03-29T01:30",
    utc: "2026-03-29T00:30:00.000Z",
    anzeige: "29.03.2026, 01:30",
  },
  {
    name: "Umstellungstag Frühjahr, nach dem Sprung",
    lokal: "2026-03-29T03:30",
    utc: "2026-03-29T01:30:00.000Z",
    anzeige: "29.03.2026, 03:30",
  },
  {
    name: "Umstellungstag Herbst, doppelte Stunde",
    lokal: "2026-10-25T02:30",
    utc: "2026-10-25T00:30:00.000Z",
    anzeige: "25.10.2026, 02:30",
  },
  {
    name: "Umstellungstag Herbst, nach der Rückstellung",
    lokal: "2026-10-25T03:30",
    utc: "2026-10-25T02:30:00.000Z",
    anzeige: "25.10.2026, 03:30",
  },
];

describe("Schreibpfade speichern echtes UTC", () => {
  for (const t of TERMINE) {
    it(`Admin-UI: ${t.name}`, () => {
      assert.equal(berlinInputToUtc(t.lokal).toISOString(), t.utc);
    });

    it(`MCP: ${t.name}`, () => {
      assert.equal(parseFollowUp(t.lokal).toISOString(), t.utc);
    });

    it(`beide Wege sind deckungsgleich: ${t.name}`, () => {
      assert.equal(
        berlinInputToUtc(t.lokal).getTime(),
        parseFollowUp(t.lokal).getTime(),
        "Admin-UI und MCP dürfen für dieselbe Eingabe nicht auseinanderlaufen"
      );
    });
  }
});

describe("Lesepfade zeigen deutsche Ortszeit", () => {
  for (const t of TERMINE) {
    const gespeichert = new Date(t.utc);

    it(`Liste und Dashboard: ${t.name}`, () => {
      assert.equal(formatBerlinDateTime(gespeichert), t.anzeige);
    });

    it(`Bearbeiten-Formular: ${t.name}`, () => {
      assert.equal(utcToBerlinInput(gespeichert), t.lokal);
    });

    it(`MCP-Bestätigungstext: ${t.name}`, () => {
      assert.equal(
        formatBerlinDateTime(gespeichert),
        t.anzeige,
        "Der MCP darf keine andere Uhrzeit nennen als das Portal anzeigt"
      );
    });
  }
});

describe("Über beide Wege geschrieben und gelesen ergibt dasselbe", () => {
  for (const t of TERMINE) {
    it(t.name, () => {
      const ueberAdmin = berlinInputToUtc(t.lokal);
      const ueberMcp = parseFollowUp(t.lokal);

      // Anzeige im Portal
      assert.equal(formatBerlinDateTime(ueberAdmin), t.anzeige);
      assert.equal(formatBerlinDateTime(ueberMcp), t.anzeige);

      // Anzeige im Formularfeld
      assert.equal(utcToBerlinInput(ueberAdmin), t.lokal);
      assert.equal(utcToBerlinInput(ueberMcp), t.lokal);

      // Erneutes Speichern ohne Änderung darf den Wert nicht verschieben
      assert.equal(berlinInputToUtc(utcToBerlinInput(ueberAdmin)).toISOString(), t.utc);
      assert.equal(parseFollowUp(utcToBerlinInput(ueberMcp)).toISOString(), t.utc);
    });
  }
});

describe("Nur-Datum-Eingabe landet auf 12:00 deutscher Zeit", () => {
  it("Sommer", () => {
    assert.equal(parseFollowUp("2026-09-16").toISOString(), "2026-09-16T10:00:00.000Z");
    assert.equal(formatBerlinDateTime(parseFollowUp("2026-09-16")), "16.09.2026, 12:00");
  });

  it("Winter", () => {
    assert.equal(parseFollowUp("2026-01-15").toISOString(), "2026-01-15T11:00:00.000Z");
    assert.equal(formatBerlinDateTime(parseFollowUp("2026-01-15")), "15.01.2026, 12:00");
  });
});

describe("Der Bug aus dem Ticket", () => {
  it("MCP schreibt 11:30 Berlin, das Portal zeigt 11:30 und nicht 09:30", () => {
    const gespeichert = parseFollowUp("2026-09-16T11:30");
    assert.equal(gespeichert.toISOString(), "2026-09-16T09:30:00.000Z");
    assert.equal(formatBerlinDateTime(gespeichert), "16.09.2026, 11:30");
    assert.equal(utcToBerlinInput(gespeichert), "2026-09-16T11:30");
  });

  it("der Offset-Trick ist nicht mehr nötig und verschiebt jetzt wirklich", () => {
    const mitTrick = parseFollowUp("2026-09-16T11:30:00+00:00");
    assert.equal(mitTrick.toISOString(), "2026-09-16T11:30:00.000Z");
    assert.equal(
      formatBerlinDateTime(mitTrick),
      "16.09.2026, 13:30",
      "Ein expliziter Offset wird respektiert – wer ihn zur Korrektur anhängt, " +
        "verschiebt den Termin um zwei Stunden"
    );
  });

  it("Portal und MCP nennen dieselbe Uhrzeit", () => {
    const gespeichert = parseFollowUp("2026-09-16T11:30");
    const imPortal = formatBerlinDateTime(gespeichert);
    const imMcpText = formatBerlinDateTime(gespeichert);
    assert.equal(imPortal, imMcpText);
    assert.equal(imPortal, "16.09.2026, 11:30");
  });
});

describe("Altdaten-Migration verschiebt keine angezeigte Uhrzeit", () => {
  // Echte Werte aus der Produktionsdatenbank, plus die Kanten.
  const altbestand = [
    "2026-09-16T11:30:00.000Z", // vom Nutzer korrigierter Bookings-Termin
    "2026-09-10T12:00:00.000Z", // Sommer, Admin-Standard 12:00
    "2026-01-15T12:00:00.000Z", // Winter
    "2026-11-01T12:00:00.000Z", // nach der Herbstumstellung
    "2026-09-11T17:39:07.827Z", // programmatisch gesetzt, mit Millisekunden
    "2026-10-25T02:30:00.000Z", // doppelt vorhandene Stunde
    "2027-01-11T05:15:00.000Z",
    "2026-04-18T08:15:00.000Z",
  ];

  for (const roh of altbestand) {
    it(`${roh} bleibt sichtbar unverändert`, () => {
      const alt = new Date(roh);
      const neu = reinterpretNaiveAsBerlin(alt);
      assert.equal(
        formatBerlinDateTime(neu),
        naiveReading(alt),
        "Die Anzeige nach der Migration muss exakt der Anzeige davor entsprechen"
      );
      assert.equal(migrationWouldShiftDisplay(alt), false);
    });
  }

  it("Sekunden und Millisekunden gehen nicht verloren", () => {
    const alt = new Date("2026-09-11T17:39:07.827Z");
    const neu = reinterpretNaiveAsBerlin(alt);
    assert.equal(neu.toISOString(), "2026-09-11T15:39:07.827Z");
  });

  it("die Sommerzeitregel richtet sich nach dem Datum des Werts, nicht nach heute", () => {
    assert.equal(
      reinterpretNaiveAsBerlin(new Date("2026-07-01T12:00:00.000Z")).toISOString(),
      "2026-07-01T10:00:00.000Z",
      "Sommer: zwei Stunden"
    );
    assert.equal(
      reinterpretNaiveAsBerlin(new Date("2026-01-15T12:00:00.000Z")).toISOString(),
      "2026-01-15T11:00:00.000Z",
      "Winter: eine Stunde"
    );
  });

  it("ein zweiter Lauf über denselben Wert wäre erkennbar falsch", () => {
    // Absicherung der Idempotenz-Anforderung: die Funktion selbst ist nicht
    // idempotent, deshalb MUSS die Migration über die Sicherungstabelle
    // steuern, welche Zeile schon migriert wurde.
    const einmal = reinterpretNaiveAsBerlin(new Date("2026-07-01T12:00:00.000Z"));
    const zweimal = reinterpretNaiveAsBerlin(einmal);
    assert.notEqual(einmal.getTime(), zweimal.getTime());
  });

  it("die übersprungene Stunde wird als nicht migrierbar erkannt", () => {
    const alt = new Date("2026-03-29T02:30:00.000Z");
    assert.equal(isBerlinDstGap("2026-03-29T02:30"), true);
    assert.equal(
      migrationWouldShiftDisplay(alt),
      true,
      "Diese Ortszeit existiert nicht, der Wert darf nicht automatisch migriert werden"
    );
  });
});

describe("Kein Pfad hängt an der Zeitzone des Servers", () => {
  it("berlinInputToUtc ignoriert die Prozess-Zeitzone", () => {
    // process.env.TZ zur Laufzeit umzustellen wirkt in Node nicht zuverlässig
    // auf bereits geladene Intl-Daten; stattdessen wird geprüft, dass das
    // Ergebnis absolut ist und nicht über lokale Getter erzeugt wurde.
    const d = berlinInputToUtc("2026-09-16T11:30");
    assert.equal(d.toISOString(), "2026-09-16T09:30:00.000Z");
    assert.equal(d.getTime(), Date.UTC(2026, 8, 16, 9, 30, 0, 0));
  });

  it("utcToBerlinInput liefert Berlin, nicht die Serverzeit", () => {
    assert.equal(utcToBerlinInput(new Date("2026-09-16T09:30:00.000Z")), "2026-09-16T11:30");
    assert.equal(utcToBerlinInput(new Date("2026-01-15T10:30:00.000Z")), "2026-01-15T11:30");
  });

  it("leere Werte kippen kein Formular", () => {
    assert.equal(utcToBerlinInput(null), "");
    assert.equal(utcToBerlinInput(undefined), "");
    assert.equal(formatBerlinDateTime(null, "–"), "–");
  });
});
