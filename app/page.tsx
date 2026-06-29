import LandingPage from "./LandingPage";

// Marketing-Kennzahlen – bewusst im Code gehalten, damit die Landing Page
// konsistent liest, unabhängig von den Werten in der Datenbank.
// Stand: Klasse 1 & 2 ausgebucht (52 Systemhäuser kumuliert), Klasse 3 in Bewerbung.
const PARTNER_COUNT = 52;
const KLASSE_3_CAPACITY = 25;
const KLASSE_3_BELEGT = 4;

export default function Page() {
  return (
    <LandingPage
      partnerCount={PARTNER_COUNT}
      klasse3Capacity={KLASSE_3_CAPACITY}
      klasse3Belegt={KLASSE_3_BELEGT}
    />
  );
}
