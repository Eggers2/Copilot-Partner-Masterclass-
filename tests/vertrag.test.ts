/**
 * Kündigung und automatische Verlängerung (lib/orders/vertrag.ts).
 *
 *   npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  endeMindestlaufzeit,
  istGekuendigt,
  verlaengertSichAutomatisch,
  vertragBeendet,
} from "../lib/orders/vertrag";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

test("ungekündigter Vertrag verlängert sich automatisch", () => {
  const b = { gekuendigtAm: null, kuendigungZum: null };
  assert.equal(istGekuendigt(b), false);
  assert.equal(verlaengertSichAutomatisch(b), true);
  assert.equal(vertragBeendet(b, d("2030-01-01")), false);
});

test("gekündigter Vertrag verlängert sich nicht", () => {
  const b = { gekuendigtAm: d("2026-10-22"), kuendigungZum: d("2027-01-20") };
  assert.equal(istGekuendigt(b), true);
  assert.equal(verlaengertSichAutomatisch(b), false);
});

test("Vertrag endet erst nach dem Stichtag", () => {
  const b = { gekuendigtAm: d("2026-10-22"), kuendigungZum: d("2027-01-20") };
  assert.equal(vertragBeendet(b, d("2027-01-20")), false);
  assert.equal(vertragBeendet(b, d("2027-01-21")), true);
});

test("Mindestlaufzeit endet am Vortag nach 12 Monaten", () => {
  assert.equal(endeMindestlaufzeit(d("2026-01-15")).toISOString().slice(0, 10), "2027-01-14");
  assert.equal(endeMindestlaufzeit(d("2026-05-22")).toISOString().slice(0, 10), "2027-05-21");
});
