import { test } from "node:test";
import assert from "node:assert/strict";
import {
  domainPasst,
  emailDomain,
  istGemeldet,
  klassenZusammenfassung,
  normalisiereDomain,
  sucheWoerter,
  teilnehmerPasstZurSuche,
  teilnehmerSucheWhere,
} from "../lib/mcp/tools/teilnehmer";

const frank = { vorname: "Christopher", nachname: "Frank", email: "c.frank@smart-net.de" };
const iridon = { vorname: "Marc", nachname: "Iridon", email: "marc.iridon@noovic.de" };

test("Suche trifft Teilstring in E-Mail, Nachname und Vorname, Groß-/Kleinschreibung egal", () => {
  assert.equal(teilnehmerPasstZurSuche(frank, "smart-net"), true);
  assert.equal(teilnehmerPasstZurSuche(frank, "SMART-NET"), true);
  assert.equal(teilnehmerPasstZurSuche(iridon, "iridon"), true);
  assert.equal(teilnehmerPasstZurSuche(iridon, "MARC"), true);
  assert.equal(teilnehmerPasstZurSuche(iridon, "smart-net"), false);
});

test("Mehrere Wörter müssen alle passen (ganzer Name)", () => {
  assert.equal(teilnehmerPasstZurSuche(frank, "Christopher Frank"), true);
  assert.equal(teilnehmerPasstZurSuche(frank, "  christopher   frank "), true);
  assert.equal(teilnehmerPasstZurSuche(frank, "Christopher Iridon"), false);
  assert.deepEqual(sucheWoerter(" A  b "), ["a", "b"]);
});

test("Prisma-Filter enthält je Wort ein OR über Vorname, Nachname und E-Mail", () => {
  const where = teilnehmerSucheWhere("Marc Iridon");
  assert.equal(where.AND.length, 2);
  assert.deepEqual(where.AND[1].OR[1], { nachname: { contains: "iridon", mode: "insensitive" } });
});

test("Domain-Abgleich exakt nach dem @, Subdomains eingeschlossen", () => {
  assert.equal(emailDomain("Max@ACP.de"), "acp.de");
  assert.equal(normalisiereDomain(" @ACP.de "), "acp.de");
  assert.equal(domainPasst("max@acp.de", "acp.de"), true);
  assert.equal(domainPasst("max@ACP.DE", "@acp.de"), true);
  assert.equal(domainPasst("max@muenchen.einsnulleins.de", "einsnulleins.de"), true);
  assert.equal(domainPasst("max@muenchen.einsnulleins.de", "muenchen.einsnulleins.de"), true);
  assert.equal(domainPasst("max@einsnulleins.de", "muenchen.einsnulleins.de"), false);
  assert.equal(domainPasst("max@xacp.de", "acp.de"), false);
  assert.equal(domainPasst("acp.de@andere.de", "acp.de"), false);
  assert.equal(domainPasst("max@acp.de", ""), false);
});

test("Leere Slots gelten nicht als gemeldet", () => {
  assert.equal(istGemeldet({ email: "" }), false);
  assert.equal(istGemeldet({ email: "   " }), false);
  assert.equal(istGemeldet({ email: "a@b.de" }), true);
});

test("Zusammenfassung je Klasse: Plätze, Gemeldete, freie Slots je Bestellung, Interne separat", () => {
  const z = klassenZusammenfassung([
    { userAnzahl: 3, intern: false, teilnehmer: [{ email: "a@x.de" }, { email: "" }, { email: "b@x.de" }] },
    // Überbuchte Bestellung darf keine freien Slots der anderen verdecken.
    { userAnzahl: 1, intern: false, teilnehmer: [{ email: "c@y.de" }, { email: "d@y.de" }] },
    { userAnzahl: 2, intern: true, teilnehmer: [{ email: "e@intern.de" }] },
  ]);
  assert.deepEqual(z, {
    bestellungen: 2,
    gebuchtePlaetze: 4,
    gemeldeteTeilnehmer: 4,
    freieSlots: 1,
    interneBestellungen: 1,
    interneTeilnehmer: 1,
  });
});
