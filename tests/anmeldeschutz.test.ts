import { test } from "node:test";
import assert from "node:assert/strict";

process.env.CUSTOMER_SESSION_SECRET = "test-secret-mindestens-16-zeichen";

import { HONEYPOT_FELD, MELDUNG, pruefeAnmeldung } from "../lib/anmeldeschutz/pruefung";
import { erzeugeFormularToken, pruefeFormularToken } from "../lib/anmeldeschutz/zeitfalle";
import { istWegwerfDomain, pruefeEmail } from "../lib/anmeldeschutz/email";
import { pruefeTurnstile } from "../lib/anmeldeschutz/turnstile";

const GERENDERT = new Date("2026-11-12T10:00:00Z");
const NACH_10S = new Date(GERENDERT.getTime() + 10_000);
const SECRET = "turnstile-secret";

/** fetch-Ersatz für Cloudflare siteverify, zählt die Aufrufe. */
function turnstileAntwort(antwort: unknown, status = 200) {
  const aufrufe: unknown[] = [];
  const fetchImpl = (async (_url: unknown, init?: unknown) => {
    aufrufe.push(init);
    return new Response(JSON.stringify(antwort), { status });
  }) as typeof fetch;
  return { fetchImpl, aufrufe };
}

const TURNSTILE_OK = turnstileAntwort({ success: true }).fetchImpl;

function anmeldung(extra: Record<string, unknown> = {}) {
  return {
    email: "max.mustermann@systemhaus-beispiel.de",
    name: "Max Mustermann",
    company: "Systemhaus Beispiel GmbH",
    formular_token: erzeugeFormularToken(GERENDERT),
    turnstile_token: "token-aus-dem-widget",
    [HONEYPOT_FELD]: "",
    ...extra,
  };
}

const ctx = (extra: Partial<Parameters<typeof pruefeAnmeldung>[1]> = {}) => ({
  ip: "203.0.113.7",
  jetzt: NACH_10S,
  turnstileSecret: SECRET,
  fetchImpl: TURNSTILE_OK,
  ...extra,
});

// ─── Normalfall ─────────────────────────────────────────────────────────────

test("saubere Anmeldung wird angelegt, ohne Verdacht und ohne Hinweise", async () => {
  const e = await pruefeAnmeldung(anmeldung(), ctx());
  assert.equal(e.aktion, "anlegen");
  if (e.aktion !== "anlegen") return;
  assert.equal(e.email, "max.mustermann@systemhaus-beispiel.de");
  assert.equal(e.name, "Max Mustermann");
  assert.equal(e.company, "Systemhaus Beispiel GmbH");
  assert.deepEqual(e.verdacht, []);
  assert.deepEqual(e.hinweise, []);
});

// ─── Honeypot ───────────────────────────────────────────────────────────────

test("Honeypot befüllt: still verwerfen, Turnstile wird gar nicht gefragt", async () => {
  const { fetchImpl, aufrufe } = turnstileAntwort({ success: true });
  const e = await pruefeAnmeldung(anmeldung({ [HONEYPOT_FELD]: "https://spam.example" }), ctx({ fetchImpl }));
  assert.equal(e.aktion, "still");
  assert.equal(e.aktion === "still" && e.grund, "honeypot");
  assert.equal(aufrufe.length, 0);
});

test("Honeypot nur mit Leerzeichen gilt als leer", async () => {
  const e = await pruefeAnmeldung(anmeldung({ [HONEYPOT_FELD]: "   " }), ctx());
  assert.equal(e.aktion, "anlegen");
});

// ─── Zeitfalle ──────────────────────────────────────────────────────────────

test("Zeitfalle: Absendung nach 1 Sekunde wird still verworfen", async () => {
  const e = await pruefeAnmeldung(anmeldung(), ctx({ jetzt: new Date(GERENDERT.getTime() + 1000) }));
  assert.equal(e.aktion, "still");
  assert.equal(e.aktion === "still" && e.grund, "zu_schnell");
});

test("Zeitfalle: genau 3 Sekunden reichen", () => {
  const token = erzeugeFormularToken(GERENDERT);
  assert.equal(pruefeFormularToken(token, new Date(GERENDERT.getTime() + 2999)).status, "zu_schnell");
  assert.equal(pruefeFormularToken(token, new Date(GERENDERT.getTime() + 3000)).status, "ok");
});

test("Zeitfalle: fehlender oder gefälschter Token wird still verworfen", async () => {
  const ohne = await pruefeAnmeldung(anmeldung({ formular_token: undefined }), ctx());
  assert.equal(ohne.aktion === "still" && ohne.grund, "zeitfalle_ungueltig");

  // Bot setzt einen eigenen, alten Zeitstempel ohne gültige Signatur.
  const echt = erzeugeFormularToken(GERENDERT)!;
  const payload = Buffer.from(`warteliste-formular:${GERENDERT.getTime() - 60_000}`).toString("base64url");
  const gefaelscht = `${payload}.${echt.split(".")[1]}`;
  const e = await pruefeAnmeldung(anmeldung({ formular_token: gefaelscht }), ctx());
  assert.equal(e.aktion === "still" && e.grund, "zeitfalle_ungueltig");
});

test("Zeitfalle: Formular älter als 24 Stunden wird mit Hinweis abgewiesen", async () => {
  const e = await pruefeAnmeldung(anmeldung(), ctx({ jetzt: new Date(GERENDERT.getTime() + 25 * 3600_000) }));
  assert.equal(e.aktion, "abweisen");
  assert.equal(e.aktion === "abweisen" && e.meldung, MELDUNG.abgelaufen);
});

// ─── Turnstile ──────────────────────────────────────────────────────────────

test("Turnstile fehlgeschlagen: abweisen mit Meldung", async () => {
  const { fetchImpl, aufrufe } = turnstileAntwort({ success: false, "error-codes": ["invalid-input-response"] });
  const e = await pruefeAnmeldung(anmeldung(), ctx({ fetchImpl }));
  assert.equal(e.aktion, "abweisen");
  if (e.aktion !== "abweisen") return;
  assert.equal(e.grund, "turnstile");
  assert.equal(e.meldung, MELDUNG.turnstile);
  assert.equal(aufrufe.length, 1);
});

test("Turnstile: Token schon benutzt (timeout-or-duplicate) wird abgewiesen", async () => {
  const { fetchImpl } = turnstileAntwort({ success: false, "error-codes": ["timeout-or-duplicate"] });
  const e = await pruefeAnmeldung(anmeldung(), ctx({ fetchImpl }));
  assert.equal(e.aktion === "abweisen" && e.grund, "turnstile");
});

test("Turnstile: fehlender Token wird abgewiesen, ohne Cloudflare zu fragen", async () => {
  const { fetchImpl, aufrufe } = turnstileAntwort({ success: true });
  const e = await pruefeAnmeldung(anmeldung({ turnstile_token: "" }), ctx({ fetchImpl }));
  assert.equal(e.aktion === "abweisen" && e.grund, "turnstile");
  assert.equal(aufrufe.length, 0);
});

test("Turnstile: falsches Secret blockiert niemanden, wird aber protokolliert", async () => {
  const { fetchImpl } = turnstileAntwort({ success: false, "error-codes": ["invalid-input-secret"] });
  const e = await pruefeAnmeldung(anmeldung(), ctx({ fetchImpl }));
  assert.equal(e.aktion, "anlegen");
  assert.equal(e.aktion === "anlegen" && e.protokoll[0]?.grund, "turnstile_stoerung");
});

test("Turnstile: Cloudflare nicht erreichbar blockiert niemanden", async () => {
  const fetchImpl = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  const e = await pruefeAnmeldung(anmeldung(), ctx({ fetchImpl }));
  assert.equal(e.aktion, "anlegen");
  assert.equal(e.aktion === "anlegen" && e.protokoll[0]?.grund, "turnstile_stoerung");
});

test("Turnstile nicht eingerichtet: keine Prüfung", async () => {
  const { fetchImpl, aufrufe } = turnstileAntwort({ success: false });
  const e = await pruefeAnmeldung(anmeldung({ turnstile_token: undefined }), ctx({ turnstileSecret: null, fetchImpl }));
  assert.equal(e.aktion, "anlegen");
  assert.equal(aufrufe.length, 0);
});

test("Turnstile schickt Secret, Token und IP an Cloudflare", async () => {
  const { fetchImpl, aufrufe } = turnstileAntwort({ success: true });
  const r = await pruefeTurnstile("abc", "203.0.113.7", SECRET, fetchImpl);
  assert.equal(r.status, "ok");
  const body = (aufrufe[0] as { body: URLSearchParams }).body;
  assert.equal(body.get("secret"), SECRET);
  assert.equal(body.get("response"), "abc");
  assert.equal(body.get("remoteip"), "203.0.113.7");
});

// ─── Wegwerf-Domains ────────────────────────────────────────────────────────

test("Wegwerf-Domain wird mit Meldung abgewiesen, ohne Turnstile zu fragen", async () => {
  const { fetchImpl, aufrufe } = turnstileAntwort({ success: true });
  const e = await pruefeAnmeldung(anmeldung({ email: "test@mailinator.com" }), ctx({ fetchImpl }));
  assert.equal(e.aktion, "abweisen");
  if (e.aktion !== "abweisen") return;
  assert.equal(e.grund, "wegwerf_domain");
  assert.equal(e.meldung, MELDUNG.wegwerf);
  assert.equal(e.emailDomain, "mailinator.com");
  assert.equal(aufrufe.length, 0);
});

test("Wegwerf-Domain: auch Subdomains und Großschreibung", () => {
  assert.equal(istWegwerfDomain("mailinator.com"), true);
  assert.equal(istWegwerfDomain("x.MAILINATOR.com"), true);
  assert.equal(istWegwerfDomain("yopmail.com"), true);
  assert.equal(istWegwerfDomain("gmail.com"), false);
  assert.equal(istWegwerfDomain("next-skills.de"), false);
});

// ─── Pflichtfelder ──────────────────────────────────────────────────────────

test("Pflichtfelder: nur E-Mail wie bei den bisherigen Bots wird abgewiesen", async () => {
  const e = await pruefeAnmeldung(anmeldung({ name: undefined, company: "" }), ctx());
  assert.equal(e.aktion, "abweisen");
  if (e.aktion !== "abweisen") return;
  assert.equal(e.grund, "pflichtfelder");
  assert.equal(e.meldung, MELDUNG.pflichtfelder);
});

test("ungültige E-Mail wird abgewiesen", async () => {
  const e = await pruefeAnmeldung(anmeldung({ email: "keine-adresse" }), ctx());
  assert.equal(e.aktion === "abweisen" && e.grund, "email_ungueltig");
});

// ─── Verdacht und Hinweise ──────────────────────────────────────────────────

test("Gmail mit drei oder mehr Punkten: Prüfquarantäne", async () => {
  const e = await pruefeAnmeldung(anmeldung({ email: "j.o.h.n.doe@gmail.com" }), ctx());
  assert.equal(e.aktion, "anlegen");
  if (e.aktion !== "anlegen") return;
  assert.equal(e.verdacht.length, 1);
  assert.match(e.verdacht[0], /4 Punkten/);
  assert.deepEqual(e.hinweise, ["Privatmail-Adresse (gmail.com)"]);
});

test("Gmail mit zwei Punkten ist unauffällig, nur Privatmail-Hinweis", () => {
  assert.equal(pruefeEmail("max.m.mustermann@gmail.com").gmailPunkte, null);
  assert.equal(pruefeEmail("m.a.x.m@googlemail.com").gmailPunkte, 3);
  // Punkte bei anderen Anbietern sind kein Verdacht.
  assert.equal(pruefeEmail("a.b.c.d@web.de").gmailPunkte, null);
});

test("Privatmail wie att.net wird nicht geblockt, nur vermerkt", async () => {
  const e = await pruefeAnmeldung(anmeldung({ email: "john1958@att.net" }), ctx());
  assert.equal(e.aktion, "anlegen");
  if (e.aktion !== "anlegen") return;
  assert.deepEqual(e.verdacht, []);
  assert.deepEqual(e.hinweise, ["Privatmail-Adresse (att.net)"]);
});

test("Link im Namen: Prüfquarantäne", async () => {
  const e = await pruefeAnmeldung(anmeldung({ name: "Cheap SEO https://spam.example" }), ctx());
  assert.equal(e.aktion === "anlegen" && e.verdacht.length, 1);
});
