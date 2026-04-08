export const metadata = { title: "Datenschutz – LaMetric Sales KPI App" };

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-2xl font-bold mb-6">
        Datenschutzerklärung – LaMetric Sales KPI App
      </h1>

      <p className="mb-4">Stand: April 2026</p>

      <h2 className="text-lg font-semibold mt-6 mb-2">1. Verantwortlicher</h2>
      <p className="mb-4">
        Copilot Berater – Alexander Eggers
        <br />
        Kontakt: siehe Impressum auf{" "}
        <a href="https://www.copilotberater.de" className="underline">
          www.copilotberater.de
        </a>
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        2. Welche Daten werden verarbeitet?
      </h2>
      <p className="mb-4">
        Die App zeigt ausschließlich einen aggregierten Gesamtumsatz an. Es
        werden keine personenbezogenen Daten erhoben, gespeichert oder an Dritte
        übermittelt. Die App greift lediglich auf eine interne API zu, die eine
        einzelne Umsatzzahl zurückgibt.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        3. Datenübertragung
      </h2>
      <p className="mb-4">
        Die Kommunikation zwischen dem LaMetric-Gerät und dem Server erfolgt
        verschlüsselt über HTTPS. Es werden keine Cookies gesetzt und kein
        Tracking durchgeführt.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        4. Rechte der Betroffenen
      </h2>
      <p className="mb-4">
        Da keine personenbezogenen Daten verarbeitet werden, entfallen
        Auskunfts-, Löschungs- und Widerspruchsrechte im Kontext dieser App.
      </p>
    </main>
  );
}
