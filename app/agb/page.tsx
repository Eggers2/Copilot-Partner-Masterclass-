import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AGB – Microsoft Copilot Partner Masterclass | NextSkills",
  description:
    "Allgemeine Geschäftsbedingungen der NextSkills GmbH für die Microsoft Copilot Partner Masterclass.",
};

export default function AGBPage() {
  return (
    <div className="min-h-screen bg-ice">
      {/* Header */}
      <header className="bg-slate border-b border-slate-2">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span
              className="font-bold text-white text-xl"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Next<span className="text-green">Skills</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-slate py-16 text-center px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 50% 80%, rgba(0,200,150,.25) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10">
          <span className="inline-block text-green text-xs font-bold tracking-widest uppercase mb-4">
            Rechtsdokument
          </span>
          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Allgemeine Geschäftsbedingungen
          </h1>
          <p className="text-gray text-lg max-w-2xl mx-auto">
            Microsoft Copilot Partner Masterclass &ndash; Abonnementprogramm
          </p>
          <p className="text-gray/60 text-sm mt-2">
            Stand: März 2026 | Version 1.0
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-cool p-6 md:p-10 space-y-10 text-slate text-sm leading-relaxed">
          {/* § 1 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 1 Geltungsbereich und Vertragspartner
            </h2>
            <p className="mb-3">
              (1) Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge über die Nutzung der Microsoft Copilot Partner Masterclass (nachfolgend &quot;Programm&quot;) zwischen:
            </p>
            <div className="bg-ice rounded-lg p-4 mb-3 text-sm">
              <table className="w-full">
                <tbody>
                  <tr><td className="font-semibold pr-4 py-1 align-top whitespace-nowrap">Anbieter</td><td className="py-1">NextSkills GmbH, Ostlandstraße 72, 31582 Nienburg</td></tr>
                  <tr><td className="font-semibold pr-4 py-1 align-top whitespace-nowrap">Handelsregister</td><td className="py-1">Amtsgericht Walsrode, HRB 209199</td></tr>
                  <tr><td className="font-semibold pr-4 py-1 align-top whitespace-nowrap">USt-IdNr.</td><td className="py-1">DE 336339658</td></tr>
                  <tr><td className="font-semibold pr-4 py-1 align-top whitespace-nowrap">Vertreten durch</td><td className="py-1">Alexander Eggers und Katherina Nehr (Geschäftsführer)</td></tr>
                  <tr><td className="font-semibold pr-4 py-1 align-top whitespace-nowrap">E-Mail</td><td className="py-1"><a href="mailto:info@next-skills.de" className="text-green hover:underline">info@next-skills.de</a></td></tr>
                </tbody>
              </table>
            </div>
            <p className="mb-3">
              (nachfolgend &quot;NextSkills&quot;) und dem jeweiligen Vertragspartner (nachfolgend &quot;Teilnehmer&quot;).
            </p>
            <p className="mb-3">
              (2) Entgegenstehende oder abweichende Bedingungen des Teilnehmers werden nicht anerkannt, es sei denn, NextSkills stimmt ihrer Geltung ausdrücklich schriftlich zu.
            </p>
            <p>
              (3) Diese AGB gelten ausschließlich gegenüber Unternehmern im Sinne des § 14 BGB. Das Programm richtet sich nicht an Verbraucher im Sinne des § 13 BGB.
            </p>
          </section>

          {/* § 2 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 2 Leistungsbeschreibung
            </h2>
            <p className="mb-3">
              (1) Das Programm ist ein 12-monatiges digitales Weiterbildungsabonnement für Microsoft-Partner und IT-Systemhäuser im DACH-Raum. Der Leistungsumfang richtet sich nach dem zum Zeitpunkt des Vertragsschlusses gültigen Angebot auf copilotberater.de und umfasst insbesondere:
            </p>
            <ul className="list-disc pl-6 mb-3 space-y-1">
              <li>On-Demand-Videokurse (Lektionen) in der gebuchten Paketgröße</li>
              <li>Live Q&A-Sessions (2x pro Monat) per Videokonferenz</li>
              <li>Zugang zur Peer-Community (Microsoft Teams oder gewählte Plattform)</li>
              <li>Praxisvorlagen, Pitch-Decks und Vertriebsunterlagen (Sales Assets)</li>
              <li>Laufende Modul-Updates während der Vertragslaufzeit</li>
            </ul>
            <p className="mb-3">
              (2) Die inkludierten Nutzer-Lizenzen (Seats) richten sich nach dem gebuchten Paket (Starter: 3, Team: 6, Business: bis 15). Zusätzliche Seats können gegen Aufpreis erworben werden.
            </p>
            <p className="mb-3">
              (3) NextSkills erbringt die Leistungen durch Bereitstellung auf der Lernplattform (next-skills.de / elopage). Der Teilnehmer erhält keinen Anspruch auf physische Materialien, sofern nicht ausdrücklich vereinbart.
            </p>
            <p>
              (4) NextSkills ist berechtigt, die Plattform und die Inhalte laufend weiterzuentwickeln, einzelne Lektionen zu aktualisieren, zu ersetzen oder zu entfernen, sofern das Gesamtprogramm qualitativ gleichwertig bleibt. Ein Anspruch auf Beibehaltung einzelner Inhalte besteht nicht.
            </p>
          </section>

          {/* § 3 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 3 Vertragsschluss und Laufzeit
            </h2>
            <p className="mb-3">
              (1) Der Vertrag kommt durch die Annahme des Angebots des Teilnehmers (Bestellung / Bezahlung) durch NextSkills zustande. Die Bestätigung per E-Mail stellt die Annahmeerklärung dar.
            </p>
            <p className="mb-3">
              (2) Das Abonnement beginnt mit dem Tag der Zugangsbereitstellung zum Programm und läuft für eine Mindestlaufzeit von 12 Monaten.
            </p>
            <p className="mb-3">
              (3) Nach Ablauf der Mindestlaufzeit (12 Monate) verlängert sich das Abonnement automatisch um jeweils 1 Monat, sofern es nicht mit einer Frist von 30 Tagen zum Ende der jeweiligen Laufzeit in Textform (E-Mail genügt) gekündigt wird.
            </p>
            <p>
              (4) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unverändert.
            </p>
          </section>

          {/* § 4 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 4 Preise und Zahlung
            </h2>
            <p className="mb-3">
              (1) Es gelten die zum Zeitpunkt des Vertragsschlusses auf copilotberater.de ausgewiesenen Preise, jeweils zzgl. der gesetzlichen Mehrwertsteuer.
            </p>
            <p className="mb-3">
              (2) Der Teilnehmer kann zwischen Jahreszahlung (Einmalzahlung) und monatlicher Zahlung wählen. Bei monatlicher Zahlung wird ein Aufschlag gemäß der aktuellen Preisliste erhoben.
            </p>
            <p className="mb-3">
              (3) Die Zahlung erfolgt über die angebotenen Zahlungsmethoden (vornehmlich Rechnung). Bei Jahreszahlung ist der Betrag sofort fällig. Bei monatlicher Zahlung wird der Betrag jeweils zum Ersten des Monats fällig.
            </p>
            <p>
              (4) Bei Zahlungsverzug ist NextSkills berechtigt, den Zugang zum Programm bis zum Ausgleich der offenen Forderungen zu sperren und Verzugszinsen nach § 288 BGB zu berechnen.
            </p>
          </section>

          {/* § 5 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 5 Preisänderungen
            </h2>
            <p className="mb-3">
              (1) NextSkills ist berechtigt, die Preise für das Abonnement mit einer Ankündigungsfrist von 30 Tagen in Textform (E-Mail) anzuheben.
            </p>
            <p className="mb-3">
              (2) Im Falle einer Preiserhöhung hat der Teilnehmer das Recht, den Vertrag außerordentlich zum Ende des laufenden Abrechnungszeitraums (Sonderkündigungsrecht) zu kündigen. Dieses Recht ist innerhalb von 14 Tagen nach Zugang der Ankündigung in Textform auszuüben.
            </p>
            <p>
              (3) Wird das Sonderkündigungsrecht nicht fristgerecht ausgeübt, gilt die Preisänderung als akzeptiert.
            </p>
          </section>

          {/* § 6 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 6 Nutzungsrechte und Lizenz
            </h2>
            <p className="mb-3">
              (1) Mit Zahlung des Entgelts erhält der Teilnehmer für die Dauer der Vertragslaufzeit ein einfaches, nicht übertragbares und nicht unterlizenzierbares Recht zur Nutzung der Programminhalte im Rahmen seiner eigenen unternehmerischen Tätigkeit.
            </p>
            <p className="mb-3">(2) Folgendes ist ausdrücklich untersagt:</p>
            <ul className="list-disc pl-6 mb-3 space-y-1">
              <li>Weitergabe von Zugangsdaten an nicht lizenzierte Nutzer</li>
              <li>Weiterverkauf, Sublizenzierung oder entgeltliche Weitergabe von Programminhalten</li>
              <li>Aufzeichnung, Vervielfältigung oder Verbreitung von Live-Sessions oder Videoinhalten</li>
              <li>Verwendung des Markennamens Copilot Partner Masterclass oder NextSkills ohne ausdrückliche schriftliche Genehmigung</li>
            </ul>
            <p className="mb-3">
              (3) Bei Verstoß gegen diese Bestimmungen ist NextSkills berechtigt, den Zugang fristlos zu sperren und Schadensersatz zu verlangen.
            </p>
            <p>
              (4) Die bereitgestellten Sales Assets (Pitch-Decks, Angebotsvorlagen, Checklisten) dürfen vom Teilnehmer im Rahmen seiner eigenen Kundenprojekte eingesetzt werden, sofern die Herkunft nicht als Produkt von NextSkills ausgegeben wird.
            </p>
          </section>

          {/* § 7 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 7 Pflichten des Teilnehmers
            </h2>
            <p className="mb-3">
              (1) Der Teilnehmer ist verpflichtet, wahrheitsgemäße Angaben bei der Registrierung zu machen und diese bei Änderungen unverzüglich zu aktualisieren.
            </p>
            <p className="mb-3">
              (2) Der Teilnehmer ist für die sichere Verwahrung seiner Zugangsdaten verantwortlich. Er haftet für alle Handlungen, die unter seinen Zugangsdaten vorgenommen werden, sofern er einen unbefugten Zugriff nicht unverzüglich nach Kenntnisnahme meldet.
            </p>
            <p>
              (3) Der Teilnehmer verpflichtet sich, die Community-Plattform respektvoll zu nutzen und keine rechtswidrigen, diskriminierenden oder rufschädigenden Inhalte zu veröffentlichen.
            </p>
          </section>

          {/* § 8 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 8 Verfügbarkeit und Wartung
            </h2>
            <p className="mb-3">
              (1) NextSkills strebt eine Verfügbarkeit der Plattform von 99% im Monatsmittel an (ausgenommen geplante Wartungsarbeiten). Ein Anspruch auf ununterbrochene Verfügbarkeit besteht nicht.
            </p>
            <p>
              (2) Geplante Wartungsfenster werden mindestens 24 Stunden im Voraus angekündigt. Bei Ausfällen von mehr als 48 Stunden am Stück (außerhalb von Wartungsfenstern) wird die Vertragslaufzeit entsprechend verlängert.
            </p>
          </section>

          {/* § 9 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 9 Haftungsausschluss
            </h2>
            <p className="mb-3">
              (1) NextSkills haftet unbeschränkt nur für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für vorsätzliche und grob fahrlässige Pflichtverletzungen.
            </p>
            <p className="mb-3">
              (2) Für leicht fahrlässige Verletzungen wesentlicher Vertragspflichten (Kardinalpflichten) haftet NextSkills der Höhe nach begrenzt auf den bei Vertragsschluss vorhersehbaren und vertragstypischen Schaden, maximal jedoch auf den Jahresbetrag des vom Teilnehmer gezahlten Entgelts.
            </p>
            <p className="mb-3">
              (3) Jegliche weitergehende Haftung ist ausgeschlossen.
            </p>
            <p className="mb-3">
              (4) <strong>Ausdrücklicher Haftungsausschluss für Microsoft 365-Inhalte:</strong> Die Programminhalte beziehen sich auf Microsoft 365 Copilot und verwandte Produkte. Microsoft aktualisiert diese Produkte laufend und kurzfristig. NextSkills kann keine Gewähr dafür übernehmen, dass alle Inhalte stets dem aktuellen Stand der Microsoft-Produkte entsprechen. Insbesondere bei Funktionen, Screenshots, Benutzeroberflächen und Lizenzbedingungen können Abweichungen auftreten. Ein Anspruch auf Aktualitätsgarantie besteht nicht. NextSkills ist jedoch bemüht, wesentliche Änderungen zeitnah einzupflegen.
            </p>
            <p>
              (5) NextSkills übernimmt keine Haftung für den wirtschaftlichen Erfolg des Teilnehmers oder die Erreichung bestimmter Umsatz- oder Kundenziele als Ergebnis der Programmteilnahme.
            </p>
          </section>

          {/* § 10 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 10 Kündigung und Beendigung
            </h2>
            <p className="mb-3">
              (1) Die ordentliche Kündigung richtet sich nach § 3 Abs. 3 dieser AGB.
            </p>
            <p className="mb-3">
              (2) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unverändert. Ein wichtiger Grund liegt für NextSkills insbesondere vor bei:
            </p>
            <ul className="list-disc pl-6 mb-3 space-y-1">
              <li>Wiederholtem oder schwerem Verstoß gegen § 6 (Nutzungsrechte)</li>
              <li>Zahlungsverzug von mehr als 30 Tagen trotz Mahnung</li>
              <li>Insolvenz oder Zahlungsunfähigkeit des Teilnehmers</li>
            </ul>
            <p className="mb-3">
              (3) Nach Vertragsende wird der Zugang zum Programm gesperrt. Der Teilnehmer hat keinen Anspruch auf Herausgabe von Videodateien oder Unterlagen.
            </p>
            <p>
              (4) Bereits gezahlte Entgelte werden bei einer ordentlichen Kündigung nicht anteilig erstattet. Bei berechtigter außerordentlicher Kündigung durch den Teilnehmer erfolgt eine anteilige Erstattung für nicht in Anspruch genommene Vertragsmonate.
            </p>
          </section>

          {/* § 11 */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              § 11 Schlussbestimmungen
            </h2>
            <p className="mb-3">
              (1) Auf alle Verträge zwischen NextSkills und dem Teilnehmer findet ausschließlich deutsches Recht Anwendung. Die Anwendung des UN-Kaufrechts (CISG) ist ausgeschlossen.
            </p>
            <p className="mb-3">
              (2) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus und im Zusammenhang mit diesen AGB ist Hannover, sofern der Teilnehmer Kaufmann ist oder keinen allgemeinen Gerichtsstand in Deutschland hat.
            </p>
            <p className="mb-3">
              (3) Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unverändert. Die unwirksame Bestimmung wird durch eine wirksame ersetzt, die dem wirtschaftlichen Zweck am nächsten kommt.
            </p>
            <p>
              (4) Änderungen und Ergänzungen dieser AGB bedürfen der Textform.
            </p>
          </section>

          {/* Footer note */}
          <div className="pt-6 border-t border-cool text-xs text-gray text-center">
            Stand: März 2026 | NextSkills GmbH |{" "}
            <a href="https://next-skills.de" target="_blank" rel="noopener noreferrer" className="text-green hover:underline">
              next-skills.de
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate border-t border-slate-2 py-6 text-center text-sm text-gray">
        <p>
          © {new Date().getFullYear()} NextSkills GmbH · copilotberater.de ·{" "}
          <a href="mailto:info@next-skills.de" className="hover:text-green transition-colors">
            info@next-skills.de
          </a>
        </p>
      </footer>
    </div>
  );
}
