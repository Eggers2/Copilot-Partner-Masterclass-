import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anrede,
  ermittleVorname,
  ersteFaelligkeit,
  imSendefenster,
  naechsteFaelligkeit,
} from "../lib/followup/sequenz";

const TAG = 24 * 60 * 60 * 1000;
const start = new Date("2026-11-02T09:00:00Z");
const tag = (n: number) => new Date(start.getTime() + n * TAG);

test("Mail 1 ist zwei Tage nach dem Eintrag fällig", () => {
  assert.deepEqual(ersteFaelligkeit(start), tag(2));
});

test("planmäßiger Takt: Tag 5, 9, 14 und Ende an Tag 19", () => {
  assert.deepEqual(naechsteFaelligkeit(start, 1, tag(2)), tag(5));
  assert.deepEqual(naechsteFaelligkeit(start, 2, tag(5)), tag(9));
  assert.deepEqual(naechsteFaelligkeit(start, 3, tag(9)), tag(14));
  assert.deepEqual(naechsteFaelligkeit(start, 4, tag(14)), tag(19));
});

test("bei Verzug liegen mindestens zwei Tage zwischen zwei Mails", () => {
  // Mail 1 geht erst an Tag 20 raus, Mail 2 wäre planmäßig längst fällig.
  assert.deepEqual(naechsteFaelligkeit(start, 1, tag(20)), tag(22));
});

test("nach der letzten Mail bleiben mindestens fünf Tage bis zum Ende", () => {
  assert.deepEqual(naechsteFaelligkeit(start, 4, tag(30)), tag(35));
});

test("Sendefenster: werktags 8 bis 18 Uhr", () => {
  assert.equal(imSendefenster({ weekday: 1, hour: 8 }), true);
  assert.equal(imSendefenster({ weekday: 5, hour: 17 }), true);
  assert.equal(imSendefenster({ weekday: 5, hour: 18 }), false);
  assert.equal(imSendefenster({ weekday: 3, hour: 7 }), false);
  assert.equal(imSendefenster({ weekday: 6, hour: 10 }), false);
  assert.equal(imSendefenster({ weekday: 7, hour: 10 }), false);
});

test("Vorname kommt bevorzugt aus dem Namen", () => {
  assert.equal(ermittleVorname("anna Schmidt", "x@firma.de"), "Anna");
  assert.equal(ermittleVorname("  Jörg  ", "x@firma.de"), "Jörg");
});

test("Vorname aus vorname.nachname@ oder vorname_nachname@", () => {
  assert.equal(ermittleVorname(null, "max.mustermann@firma.de"), "Max");
  assert.equal(ermittleVorname("", "ERIKA_muster@firma.de"), "Erika");
});

test("kein Vorname bei Sammelpostfächern, Kürzeln und Einzelwörtern", () => {
  assert.equal(ermittleVorname(null, "info.vertrieb@firma.de"), null);
  assert.equal(ermittleVorname(null, "mm.schulz@firma.de"), null);
  assert.equal(ermittleVorname(null, "mueller@firma.de"), null);
  assert.equal(ermittleVorname(null, "a1b.c@firma.de"), null);
  assert.equal(ermittleVorname("Dr. Meier", "x@firma.de"), null);
});

test("Anrede mit und ohne Vornamen", () => {
  assert.equal(anrede("Max"), "Hallo Max,");
  assert.equal(anrede(null), "Hallo,");
});

test("Textfassung enthält Anrede, Bookings-Link und Abmelde-Link, aber kein HTML", async () => {
  const { htmlToPlainText } = await import("../lib/email/format");
  const { TEMPLATE_REGISTRY, renderTemplate, sampleVarsFor } = await import("../lib/email/renderTemplate");
  const key = "warteliste_followup_1";
  const text = htmlToPlainText(renderTemplate(TEMPLATE_REGISTRY[key].defaultHtml, sampleVarsFor(key)));
  assert.match(text, /^Hallo Max,/);
  assert.match(text, /Hier einen Termin mit mir buchen: https:\/\/outlook\.office\.com\/bookwithme\/\S+&ep=bwmEmailSignature/);
  assert.match(text, /Keine weiteren Mails dazu: https:\/\/www\.copilotberater\.de\/warteliste\/abmelden/);
  assert.doesNotMatch(text, /<|&amp;/);
});

test("Bestätigung verlinkt den Sofort-Bonus auf copilotberater.de, nicht mehr bei Wix", async () => {
  const { existsSync } = await import("node:fs");
  const { TEMPLATE_REGISTRY } = await import("../lib/email/renderTemplate");
  const html = TEMPLATE_REGISTRY.warteliste_bestaetigung.defaultHtml;
  assert.doesNotMatch(html, /usrfiles\.com/);
  const match = html.match(/https:\/\/www\.copilotberater\.de(\/downloads\/[^"]+\.pdf)/);
  assert.ok(match, "Bonus-Link fehlt");
  assert.ok(existsSync(`public${match[1]}`), `public${match[1]} fehlt`);
});
