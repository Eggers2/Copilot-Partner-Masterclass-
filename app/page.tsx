import LandingPage from "./LandingPage";
import { getOffeneKlasseBelegung } from "@/lib/klassen";

// Marketing-Kennzahl – bewusst im Code gehalten, damit die Landing Page
// konsistent liest, unabhängig von den Werten in der Datenbank.
// Stand: Klasse 1 & 2 ausgebucht (52 Systemhäuser kumuliert).
const PARTNER_COUNT = 52;

// Kommunizierte Kapazität der offenen Klasse (Klasse 3, Start vsl. Oktober
// 2026). Bewusst im Code festgelegt: Die Startseite soll durchgängig "20
// Plätze" sagen, auch wenn in der Datenbank ein anderer Wert steht. Die
// Belegung kommt weiterhin live aus der DB (Anzahl Bestellungen der offenen
// Klasse) – siehe getOffeneKlasseBelegung(). Wird die Zahl hier geändert,
// gehört sie auch im Admin unter Klassen → Kapazität angepasst, damit die
// Zuweisung neuer Bestellungen dieselbe Grenze nutzt.
const KLASSE_3_CAPACITY = 20;
const KLASSE_3_BELEGT_FALLBACK = 7;

// Der Platz-Zähler liest live aus der DB → kein Static Render.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { belegt } = await getOffeneKlasseBelegung({
    capacity: KLASSE_3_CAPACITY,
    belegt: KLASSE_3_BELEGT_FALLBACK,
  });

  return (
    <LandingPage
      partnerCount={PARTNER_COUNT}
      klasse3Capacity={KLASSE_3_CAPACITY}
      // Nie mehr als die kommunizierte Kapazität anzeigen – sonst stünde bei
      // einer höheren DB-Kapazität z. B. "22 / 20 Plätze vergeben".
      klasse3Belegt={Math.min(belegt, KLASSE_3_CAPACITY)}
    />
  );
}
