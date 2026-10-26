import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAdnSchweizNotiz, parseUtm } from "../lib/adn-schweiz/lead";

test("parseUtm übernimmt nur UTM-Felder, kürzt auf 100 Zeichen und nimmt bei Mehrfachwerten den ersten", () => {
  const utm = parseUtm({
    utm_source: "adn",
    utm_medium: ["event", "zweiter"],
    utm_campaign: " adn_schweiz_okt26 ",
    utm_content: "",
    utm_term: "x".repeat(150),
    fremd: "ignorieren",
  });
  assert.deepEqual(utm, {
    utm_source: "adn",
    utm_medium: "event",
    utm_campaign: "adn_schweiz_okt26",
    utm_term: "x".repeat(100),
  });
});

test("Notiz enthält Titel, UTM-Werte und Einwilligung ja", () => {
  const notiz = buildAdnSchweizNotiz(
    { utm_source: "adn", utm_medium: "event", utm_campaign: "adn_schweiz_okt26" },
    true
  );
  assert.equal(
    notiz,
    "ADN Schweiz 28.10.2026, Folien-Download\n" +
      "UTM: utm_source=adn, utm_medium=event, utm_campaign=adn_schweiz_okt26\n" +
      "Marketing-Einwilligung: ja"
  );
});

test("Notiz ohne UTM-Werte und ohne Einwilligung", () => {
  assert.equal(
    buildAdnSchweizNotiz({}, false),
    "ADN Schweiz 28.10.2026, Folien-Download\nUTM: keine\nMarketing-Einwilligung: nein"
  );
});
