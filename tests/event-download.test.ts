import { test } from "node:test";
import assert from "node:assert/strict";
import { EVENT_DOWNLOADS } from "../lib/event-download/events";
import { buildEventNotiz, parseUtm } from "../lib/event-download/lead";

const ADN = EVENT_DOWNLOADS["adn-schweiz"].notizTitel;

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
  const notiz = buildEventNotiz(ADN, 
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
    buildEventNotiz(ADN, {}, false),
    "ADN Schweiz 28.10.2026, Folien-Download\nUTM: keine\nMarketing-Einwilligung: nein"
  );
});

test("Ingram München: eigener Notiztitel, Pfad und PDF", () => {
  const e = EVENT_DOWNLOADS["ingram-muenchen"];
  assert.equal(
    buildEventNotiz(
      e.notizTitel,
      { utm_source: "ingram", utm_medium: "event", utm_campaign: "ingram_muenchen_nov26" },
      true
    ),
    "Ingram Micro München 03.11.2026, Folien-Download\n" +
      "UTM: utm_source=ingram, utm_medium=event, utm_campaign=ingram_muenchen_nov26\n" +
      "Marketing-Einwilligung: ja"
  );
  assert.equal(e.slug, "ingram-muenchen");
  assert.match(e.pdfUrl, /^\/downloads\/.+\.pdf$/);
});
