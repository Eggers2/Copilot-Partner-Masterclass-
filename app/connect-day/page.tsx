import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Clock,
  MapPin,
  Mic2,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CONNECT_DAY_SLUG } from "@/lib/events/connectDay";
import { ConnectDayCountdown } from "@/components/ConnectDayCountdown";

// Öffentliche Event-Landingpage mit Live-Zähler – nie statisch cachen.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Copilot Connect Day 2026 – 10./11. Dezember, Frankfurt | Next Skills",
  description:
    "Das Live-Event der Copilot Partner Masterclass für Klasse 1 & 2: zwei Tage Austausch, 4 Microsoft MVPs, nhow Hotel Frankfurt, Skybar auf 185 Metern. Nur 100 Plätze.",
};

const SPEAKERS = [
  { name: "Tanja Wiehoff", thema: "Copilot Studio / Agenten" },
  { name: "Raphael Köllner", thema: "Compliance / Datenschutz" },
  { name: "Michael Greth", thema: "Copilot / SharePoint" },
  { name: "Alex Eggers", thema: "Copilot / Adoption" },
];

const LEISTUNGEN = [
  { icon: BedDouble, text: "Hotelübernachtung im nhow Hotel Frankfurt" },
  { icon: UtensilsCrossed, text: "Mittagssnack & Kaffeepausen an beiden Tagen" },
  { icon: Sparkles, text: "Gemeinsames Abendessen" },
  {
    icon: Wine,
    text: "2 Stunden in der höchsten Skybar Deutschlands – 185 m über Frankfurt, Bier/Wein/Softdrinks inklusive",
  },
];

const FAQ = [
  {
    q: "Wer kann teilnehmen?",
    a: "Der Connect Day ist exklusiv für Partner aus Klasse 1 und Klasse 2 der Copilot Partner Masterclass. Pro Firma können bis zu 3 Personen angemeldet werden – zur Auswahl stehen die Masterclass-Teilnehmer eurer Bestellung.",
  },
  {
    q: "Wie melde ich mich an?",
    a: "Die Anmeldung läuft über das Kundenportal (Login mit deiner E-Mail-Adresse). First Come, First Serve – es gibt genau 100 Plätze, der Live-Zähler zeigt jederzeit den Stand.",
  },
  {
    q: "Was kostet die Teilnahme?",
    a: "Der Eigenanteil beträgt 199 € netto pro Person – Hotelübernachtung, Verpflegung, Abendessen und Skybar sind bereits enthalten. Die Rechnung kommt automatisch per E-Mail; der Platz ist nach Zahlungseingang verbindlich bestätigt.",
  },
  {
    q: "Kann ich stornieren oder jemanden anderen schicken?",
    a: "Teilnehmer könnt ihr bis zum Eventbeginn jederzeit kostenlos im Kundenportal tauschen. Eine Absage ist ebenfalls jederzeit möglich, kostet aber 399 €, falls wir den Platz nicht nachbesetzen können – die Anmeldung ist verbindlich.",
  },
  {
    q: "Bis wann kann ich mich anmelden?",
    a: "Anmeldeschluss ist der 17. Juli 2026 – sofern bis dahin überhaupt noch Plätze frei sind.",
  },
];

export default async function ConnectDayLandingPage() {
  const event = await prisma.event.findUnique({
    where: { slug: CONNECT_DAY_SLUG },
  });

  const capacity = event?.capacity ?? 100;
  const seatsTaken = event ? Math.min(event.seatsTaken, capacity) : 0;
  const seatsFrei = capacity - seatsTaken;
  const prozent = Math.min(100, Math.round((seatsTaken / capacity) * 100));

  const now = new Date();
  const notYetOpen = event
    ? !event.manuellFreigeschaltet &&
      event.anmeldestart !== null &&
      now < event.anmeldestart
    : true;
  const deadlinePassed = event ? now > event.anmeldeschluss : false;
  const isFull = seatsFrei <= 0;
  const anmeldungOffen =
    event?.status === "OPEN" && !notYetOpen && !deadlinePassed && !isFull;

  return (
    <div style={{ background: "#1A1A2E" }} className="min-h-screen">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,.7) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[120px] opacity-20"
          style={{ background: "#00C896" }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
          <div className="mb-8">
            <span
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold border border-[#00C896]/40 text-[#00C896]"
              style={{ background: "rgba(0,200,150,.10)" }}
            >
              <span className="relative flex w-2 h-2">
                <span
                  className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping"
                  style={{ background: "#00C896" }}
                />
                <span
                  className="relative inline-flex w-2 h-2 rounded-full"
                  style={{ background: "#00C896" }}
                />
              </span>
              Exklusiv für Klasse 1 &amp; 2 · nur 100 Plätze
            </span>
          </div>

          <h1
            className="text-white font-extrabold leading-[1.05] mb-6"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: "clamp(38px, 5.5vw, 68px)",
              letterSpacing: "-0.025em",
            }}
          >
            Copilot <span className="text-[#00C896]">Connect Day</span> 2026
          </h1>

          <p className="text-white/60 text-lg md:text-xl max-w-[640px] mx-auto mb-8 leading-relaxed">
            Zwei Tage persönlicher Austausch statt Teams-Kachel: die Community
            der Copilot Partner Masterclass live in Frankfurt – mit vier
            Microsoft MVPs, der ADN als Sponsor und einem Abend 185 Meter über
            der Stadt.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-white/80 text-sm md:text-base mb-10">
            <span className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#00C896]" />
              10. &amp; 11. Dezember 2026
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00C896]" />
              Do 12:00 – Fr 14:00 Uhr
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#00C896]" />
              nhow Hotel Frankfurt am Main
            </span>
          </div>

          {/* Live-Zähler */}
          <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-white/5 p-5 mb-10">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="flex items-center gap-2 text-white/80 font-medium">
                <Users className="w-4 h-4 text-[#00C896]" />
                {seatsTaken} von {capacity} Plätzen belegt
              </span>
              <span
                className={`font-bold ${seatsFrei <= 15 ? "text-red-400" : "text-[#00C896]"}`}
              >
                {isFull
                  ? "Ausgebucht"
                  : `${seatsFrei} ${seatsFrei === 1 ? "Platz" : "Plätze"} frei`}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${prozent >= 85 ? "bg-red-400" : "bg-[#00C896]"}`}
                style={{ width: `${Math.max(prozent, 2)}%` }}
              />
            </div>
            <p className="text-xs text-white/40 mt-2">
              First Come, First Serve · Anmeldeschluss 17.07.2026
            </p>
          </div>

          {/* CTA je nach Zustand */}
          {notYetOpen && event?.anmeldestart ? (
            <div className="space-y-5">
              <p className="text-white font-semibold text-lg">
                Anmeldung öffnet am{" "}
                <span className="text-[#00C896]">7. Juli 2026, 0:00 Uhr</span>
              </p>
              <ConnectDayCountdown targetIso={event.anmeldestart.toISOString()} />
              <p className="text-white/50 text-sm">
                Die Anmeldung läuft über das Kundenportal – Login einfach mit
                deiner E-Mail-Adresse.
              </p>
            </div>
          ) : anmeldungOffen ? (
            <Link
              href="/kundenportal"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[#1A1A2E] transition-transform hover:scale-[1.02]"
              style={{ background: "#00C896" }}
            >
              Jetzt Platz sichern – zum Kundenportal
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <p className="text-white/60 text-lg font-medium">
              {isFull
                ? "Der Connect Day ist ausgebucht – Stornos kommen vor, melde dich gern für die Nachrückliste."
                : "Die Anmeldung ist geschlossen."}
            </p>
          )}
        </div>
      </section>

      {/* ═══ SPEAKER ═══ */}
      <section className="border-t border-white/10 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="flex items-center justify-center gap-2 text-white text-2xl md:text-3xl font-bold text-center mb-3 font-heading">
            <Mic2 className="w-6 h-6 text-[#00C896]" />4 Microsoft MVPs vor Ort
          </h2>
          <p className="text-white/50 text-center mb-10">
            Vorträge und Workshops – und danach genug Zeit für eure Fragen.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SPEAKERS.map((s) => (
              <div
                key={s.name}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center"
              >
                <div
                  className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center text-[#1A1A2E] font-bold text-lg"
                  style={{ background: "#00C896" }}
                >
                  {s.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <p className="text-white font-semibold">{s.name}</p>
                <p className="text-white/50 text-sm mt-1">{s.thema}</p>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-sm text-center mt-8">
            Mit dabei: die <strong className="text-white/70">ADN</strong> als
            Distributor und Sponsor des Events.
          </p>
        </div>
      </section>

      {/* ═══ LEISTUNGEN + PREIS ═══ */}
      <section className="border-t border-white/10 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-white text-2xl md:text-3xl font-bold text-center mb-10 font-heading">
            Ein Preis, alles drin
          </h2>
          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <ul className="space-y-4">
                {LEISTUNGEN.map((l) => (
                  <li key={l.text} className="flex items-start gap-3 text-white/80">
                    <l.icon className="w-5 h-5 text-[#00C896] flex-shrink-0 mt-0.5" />
                    <span>{l.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="rounded-2xl border p-6 flex flex-col items-center justify-center text-center"
              style={{ borderColor: "rgba(0,200,150,.4)", background: "rgba(0,200,150,.08)" }}
            >
              <p className="text-white/60 text-sm uppercase tracking-wider mb-2">
                Eigenanteil
              </p>
              <p className="text-white font-extrabold text-5xl mb-1">
                199 €<span className="text-xl font-semibold text-white/60"> netto</span>
              </p>
              <p className="text-white/60 mb-4">pro Person</p>
              <p className="text-white/50 text-sm">
                Maximal 3 Personen pro Firma · Rechnung kommt automatisch per
                E-Mail · Platz verbindlich nach Zahlungseingang
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="border-t border-white/10 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-white text-2xl md:text-3xl font-bold text-center mb-10 font-heading">
            Häufige Fragen
          </h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 group"
              >
                <summary className="text-white font-semibold cursor-pointer list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-[#00C896] group-open:rotate-45 transition-transform text-xl leading-none">
                    +
                  </span>
                </summary>
                <p className="text-white/60 text-sm leading-relaxed mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ABSCHLUSS-CTA ═══ */}
      <section className="border-t border-white/10 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-4 font-heading">
            {notYetOpen
              ? "Am 7. Juli um 0:00 Uhr geht's los."
              : anmeldungOffen
                ? "Wer zuerst kommt, feiert oben."
                : "Bis zum nächsten Mal."}
          </h2>
          <p className="text-white/50 mb-8">
            {notYetOpen
              ? "Kalender blocken, Team abstimmen – und dann schnell sein: 100 Plätze, First Come, First Serve."
              : anmeldungOffen
                ? `Noch ${seatsFrei} ${seatsFrei === 1 ? "Platz" : "Plätze"} – die Anmeldung dauert keine zwei Minuten.`
                : "Schreib uns, wenn du auf die Nachrückliste möchtest."}
          </p>
          <Link
            href="/kundenportal"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[#1A1A2E] transition-transform hover:scale-[1.02]"
            style={{ background: "#00C896" }}
          >
            Zum Kundenportal
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <span className="font-bold text-white/70">
            Next<span className="text-[#00C896]">Skills</span>{" "}
            <span className="font-normal text-white/40">
              · Copilot Partner Masterclass
            </span>
          </span>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white/70 transition-colors">
              Startseite
            </Link>
            <Link href="/impressum" className="hover:text-white/70 transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-white/70 transition-colors">
              Datenschutz
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
