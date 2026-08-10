import LandingPage from "./LandingPage";
import { getOffeneKlasseBelegung } from "@/lib/klassen";

// Marketing-Kennzahl – bewusst im Code gehalten, damit die Landing Page
// konsistent liest, unabhängig von den Werten in der Datenbank.
// Stand: Klasse 1 & 2 ausgebucht (52 Systemhäuser kumuliert).
const PARTNER_COUNT = 52;

// Nur Fallback, falls keine Klasse auf OPEN steht oder die DB nicht erreichbar
// ist. Im Normalfall kommen Kapazität und Belegung live aus der Datenbank
// (Anzahl Bestellungen der offenen Klasse) – siehe getOffeneKlasseBelegung().
const KLASSE_3_CAPACITY_FALLBACK = 25;
const KLASSE_3_BELEGT_FALLBACK = 7;

// Der Platz-Zähler liest live aus der DB → kein Static Render.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { capacity, belegt } = await getOffeneKlasseBelegung({
    capacity: KLASSE_3_CAPACITY_FALLBACK,
    belegt: KLASSE_3_BELEGT_FALLBACK,
  });

  return (
    <LandingPage
      partnerCount={PARTNER_COUNT}
      klasse3Capacity={capacity}
      klasse3Belegt={belegt}
    />
  );
}
