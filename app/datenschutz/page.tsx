import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – Microsoft Copilot Partner Masterclass | NextSkills",
  description:
    "Datenschutzerklärung der NextSkills GmbH – Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.",
};

export default function DatenschutzPage() {
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
            Datenschutzerklärung
          </h1>
          <p className="text-gray text-lg max-w-2xl mx-auto">
            Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-cool p-6 md:p-10 space-y-10 text-slate text-sm leading-relaxed">
          <p className="text-gray">Stand: Juni 2026</p>

          {/* 1. Verantwortlicher */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              1. Verantwortlicher
            </h2>
            <p className="mb-1">NextSkills GmbH</p>
            <p className="mb-1">Ostlandstraße 72</p>
            <p className="mb-4">31582 Nienburg/Weser</p>
            <p className="mb-1">
              <span className="font-semibold">E-Mail:</span>{" "}
              <a href="mailto:ae@nextvideo.de" className="text-green hover:underline">
                ae@nextvideo.de
              </a>
            </p>
            <p className="mb-4">
              <span className="font-semibold">Telefon:</span>{" "}
              <a href="tel:+4915118224446" className="text-green hover:underline">
                +49 151 18224446
              </a>
            </p>
            <p>
              Weitere Angaben zum Verantwortlichen finden Sie in unserem{" "}
              <Link href="/impressum" className="text-green hover:underline">
                Impressum
              </Link>
              .
            </p>
          </section>

          {/* 2. Allgemeines */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              2. Verarbeitung beim Besuch der Website (Server-Logfiles)
            </h2>
            <p className="mb-4">
              Beim Aufruf unserer Website werden durch den Browser automatisch
              Informationen an den Server unseres Hosters übermittelt und temporär in
              sogenannten Logfiles gespeichert (u.&nbsp;a. IP-Adresse, Datum und Uhrzeit
              des Zugriffs, aufgerufene Seite, verwendeter Browser und Betriebssystem).
              Dies dient der technischen Bereitstellung, Sicherheit und Stabilität der
              Website. Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO
              (berechtigtes Interesse am sicheren und stabilen Betrieb).
            </p>
            <p>
              Unsere Website wird bei einem externen Dienstleister (Hosting/Cloud-Infrastruktur)
              gehostet. Dieser verarbeitet die vorgenannten Daten ausschließlich in unserem
              Auftrag auf Grundlage eines Auftragsverarbeitungsvertrags gemäß Art.&nbsp;28 DSGVO.
            </p>
          </section>

          {/* 3. Beratersuche / Kartendienst */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              3. Beratersuche &amp; Kartendienst
            </h2>
            <p className="mb-4">
              Auf der Seite{" "}
              <Link href="/suche" className="text-green hover:underline">
                Beratersuche
              </Link>{" "}
              können Sie über die Eingabe einer Postleitzahl oder eines Ortes nach
              Copilot-Beratern in Ihrer Nähe suchen. Zur Ermittlung der geografischen
              Koordinaten Ihrer Eingabe wird die Suchanfrage an den Geocoding-Dienst{" "}
              <a
                href="https://nominatim.openstreetmap.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green hover:underline"
              >
                Nominatim (OpenStreetMap)
              </a>{" "}
              übermittelt. Zur Darstellung der Karte und der Kartenkacheln werden Daten von
              den Servern der OpenStreetMap Foundation geladen; dabei wird Ihre IP-Adresse an
              diese Server übertragen. Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f
              DSGVO (berechtigtes Interesse an einer funktionierenden Umkreissuche).
            </p>
            <p>
              Nutzen Sie die Funktion &bdquo;In meiner Nähe&ldquo;, fragt Ihr Browser Ihre Zustimmung zur
              Standortermittlung ab. Die ermittelten Koordinaten werden ausschließlich transient
              zur Berechnung der nächstgelegenen Berater verwendet und nicht dauerhaft
              gespeichert. Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO
              (Einwilligung), die Sie jederzeit über die Einstellungen Ihres Browsers
              widerrufen können.
            </p>
          </section>

          {/* 4. LinkedIn Insight Tag */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              4. LinkedIn Insight Tag
            </h2>
            <p>
              Auf unserer Startseite setzen wir den &bdquo;LinkedIn Insight Tag&ldquo; der LinkedIn
              Ireland Unlimited Company ein. Damit werden Cookies in Ihrem Browser gespeichert,
              die LinkedIn die Analyse Ihres Besuchs und die Messung von Werbekampagnen
              ermöglichen. Dabei kann es zu einer Übertragung von Daten an LinkedIn-Server in
              den USA kommen. Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO
              (berechtigtes Interesse an Reichweitenanalyse und Online-Marketing). Sie können
              der Verarbeitung unter{" "}
              <a
                href="https://www.linkedin.com/psettings/guest-controls/retargeting-opt-out"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green hover:underline"
              >
                linkedin.com/psettings/guest-controls/retargeting-opt-out
              </a>{" "}
              widersprechen. Weitere Informationen finden Sie in der{" "}
              <a
                href="https://www.linkedin.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green hover:underline"
              >
                LinkedIn Datenschutzerklärung
              </a>
              .
            </p>
          </section>

          {/* 5. Kampagnen-Attribution (UTM) */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              5. Kampagnen-Attribution (UTM-Parameter)
            </h2>
            <p>
              Wenn Sie unsere Seite über einen Werbe- oder Kampagnen-Link erreichen, werten wir
              die in der URL übermittelten UTM-Parameter (z.&nbsp;B. <code>utm_source</code>,{" "}
              <code>utm_medium</code>, <code>utm_campaign</code>) sowie den Referrer (vorherige
              Seite) und die Landingpage technisch aus. Diese Informationen werden in Ihrem
              Browser-Speicher (localStorage, Schlüssel <code>cb_utm_data</code>) für maximal
              90&nbsp;Tage abgelegt und ausschließlich beim Absenden des Wartelisten-Formulars
              zusammen mit Ihrer E-Mail-Adresse an unseren Server übertragen, um die Wirksamkeit
              unserer Kampagnen messen zu können. Es findet keine Profilbildung statt; die Daten
              werden nicht an Dritte übermittelt. Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1
              lit.&nbsp;f DSGVO (berechtigtes Interesse an Kampagnen-Reporting). Sie können die
              gespeicherten Daten jederzeit in den Entwickler-Tools Ihres Browsers unter{" "}
              <em>Application &rsaquo; Local Storage</em> einsehen und löschen.
            </p>
          </section>

          {/* 6. Kontaktaufnahme / Warteliste */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              6. Kontaktaufnahme &amp; Warteliste
            </h2>
            <p>
              Wenn Sie uns kontaktieren oder sich in unsere Warteliste eintragen, verarbeiten
              wir die von Ihnen angegebenen Daten (insbesondere E-Mail-Adresse) zur Bearbeitung
              Ihrer Anfrage bzw. zur Aufnahme in das Programm. Rechtsgrundlage ist
              Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO (Durchführung vorvertraglicher
              Maßnahmen) bzw. Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO (Einwilligung). Die
              Daten werden gelöscht, sobald sie für den Zweck nicht mehr erforderlich sind und
              keine gesetzlichen Aufbewahrungsfristen entgegenstehen.
            </p>
          </section>

          {/* 7. Rechte der Betroffenen */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              7. Ihre Rechte
            </h2>
            <p className="mb-4">
              Sie haben jederzeit das Recht auf Auskunft über die zu Ihrer Person gespeicherten
              Daten sowie auf Berichtigung, Löschung, Einschränkung der Verarbeitung,
              Datenübertragbarkeit und Widerspruch gegen die Verarbeitung. Erteilte
              Einwilligungen können Sie jederzeit mit Wirkung für die Zukunft widerrufen.
              Wenden Sie sich hierzu an den unter Ziffer&nbsp;1 genannten Verantwortlichen.
            </p>
            <p>
              Ihnen steht zudem ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu.
              Zuständig ist u.&nbsp;a. die Landesbeauftragte für den Datenschutz Niedersachsen.
            </p>
          </section>

          {/* Footer note */}
          <div className="pt-6 border-t border-cool text-xs text-gray text-center">
            NextSkills GmbH |{" "}
            <a
              href="https://next-skills.de"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green hover:underline"
            >
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
