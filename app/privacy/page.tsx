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
        verschlüsselt über HTTPS. Im Rahmen der App selbst werden keine
        zusätzlichen Cookies gesetzt.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        4. LinkedIn Insight Tag (Landingpage)
      </h2>
      <p className="mb-4">
        Auf unserer Startseite setzen wir den &bdquo;LinkedIn Insight Tag&ldquo; der
        LinkedIn Ireland Unlimited Company ein. Damit werden Cookies in Ihrem
        Browser gespeichert, die LinkedIn die Analyse Ihres Besuchs und die
        Messung von Werbekampagnen ermöglichen. Dabei kann es zu einer
        Übertragung von Daten an LinkedIn-Server in den USA kommen.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
        an Reichweitenanalyse und Online-Marketing). Sie können der
        Verarbeitung unter{" "}
        <a
          href="https://www.linkedin.com/psettings/guest-controls/retargeting-opt-out"
          className="underline"
        >
          linkedin.com/psettings/guest-controls/retargeting-opt-out
        </a>{" "}
        widersprechen. Weitere Informationen finden Sie in der{" "}
        <a
          href="https://www.linkedin.com/legal/privacy-policy"
          className="underline"
        >
          LinkedIn Datenschutzerklärung
        </a>
        .
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">
        5. Rechte der Betroffenen
      </h2>
      <p className="mb-4">
        Sie haben jederzeit das Recht auf Auskunft über die zu Ihrer Person
        gespeicherten Daten sowie auf Berichtigung, Löschung, Einschränkung
        der Verarbeitung, Datenübertragbarkeit und Widerspruch gegen die
        Verarbeitung. Wenden Sie sich hierzu an den im Impressum genannten
        Verantwortlichen.
      </p>
    </main>
  );
}
