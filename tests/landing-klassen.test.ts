/**
 * Regeln der Klassenanzeige auf der Startseite (lib/landing/klassen.ts).
 *
 *   npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLandingKlassen, FALLBACK_GESTARTET, FALLBACK_OFFEN, type KlasseRow } from "../lib/landing/klassen";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

const K1: KlasseRow = { id: "k1", name: "Klasse 1", kickoffDate: d("2026-05-22"), status: "CLOSED", capacity: 31, belegt: 31 };
const K2: KlasseRow = { id: "k2", name: "Klasse 2", kickoffDate: d("2026-06-23"), status: "CLOSED", capacity: 25, belegt: 20 };
const K3: KlasseRow = { id: "k3", name: "Klasse 3", kickoffDate: d("2026-09-28"), status: "CLOSED", capacity: 25, belegt: 24 };
const K4: KlasseRow = { id: "k4", name: "Klasse 4", kickoffDate: d("2027-01-21"), status: "OPEN", capacity: 20, belegt: 0 };

const heute = new Date("2026-09-30T10:00:00.000Z");

test("offene Klasse nennt nur Monat und Jahr", () => {
  const r = buildLandingKlassen([K1, K2, K3, K4], heute);
  assert.equal(r.offen.name, "Klasse 4");
  assert.equal(r.offen.startMonat, "Januar 2027");
  assert.equal(r.offen.startMonatIso, "2027-01");
  assert.equal(r.offen.phase, "offen");
});

test("Zeitleiste ist chronologisch und markiert jede Phase", () => {
  const r = buildLandingKlassen([K4, K3, K1, K2], heute);
  assert.deepEqual(r.zeitleiste.map((k) => [k.name, k.phase]), [
    ["Klasse 1", "laeuft"],
    ["Klasse 2", "laeuft"],
    ["Klasse 3", "gestartet"],
    ["Klasse 4", "offen"],
  ]);
  assert.equal(r.gestartet, 3);
  assert.equal(r.geradeGestartet, "Klasse 3");
});

test("nach FRISCH_TAGE gilt keine Klasse mehr als gerade gestartet", () => {
  const r = buildLandingKlassen([K1, K2, K3, K4], new Date("2026-11-01T10:00:00.000Z"));
  assert.equal(r.geradeGestartet, null);
  assert.equal(r.zeitleiste[2].phase, "laeuft");
});

test("geplante Klassen erscheinen nicht", () => {
  const r = buildLandingKlassen([K1, K2, K3, { ...K4, status: "PLANNED" }], heute);
  assert.equal(r.zeitleiste.some((k) => k.name === "Klasse 4" && k.id === "k4"), false);
  assert.equal(r.offen, FALLBACK_OFFEN);
});

test("volle OPEN-Klasse wird übersprungen, wie bei getNextOpenKlasse()", () => {
  const voll = { ...K3, status: "OPEN" as const, belegt: 25 };
  const r = buildLandingKlassen([K1, K2, voll, K4], heute);
  assert.equal(r.offen.name, "Klasse 4");
});

test("Zähler erst ab 5 vergebenen Plätzen", () => {
  assert.equal(buildLandingKlassen([K4], heute).offen.zeigeZaehler, false);
  assert.equal(buildLandingKlassen([{ ...K4, belegt: 5 }], heute).offen.zeigeZaehler, true);
});

test("ohne Daten greift der Fallback und die Seite rendert trotzdem", () => {
  const r = buildLandingKlassen([], heute);
  assert.equal(r.offen, FALLBACK_OFFEN);
  assert.deepEqual(r.zeitleiste, [FALLBACK_OFFEN]);
  assert.equal(r.gestartet, FALLBACK_GESTARTET);
});

test("höchstens vier Klassen in der Zeitleiste", () => {
  const K5: KlasseRow = { ...K4, id: "k5", name: "Klasse 5", kickoffDate: d("2027-05-01"), status: "PLANNED" };
  const K0: KlasseRow = { ...K1, id: "k0", name: "Klasse 0", kickoffDate: d("2026-01-01") };
  const r = buildLandingKlassen([K0, K1, K2, K3, K4, K5], heute);
  assert.equal(r.zeitleiste.length, 4);
  assert.equal(r.zeitleiste[3].name, "Klasse 4");
});
