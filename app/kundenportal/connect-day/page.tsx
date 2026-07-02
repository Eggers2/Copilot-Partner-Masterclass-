import {
  CalendarDays,
  MapPin,
  Users,
  Mic2,
  BedDouble,
  UtensilsCrossed,
  Sparkles,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { requireCustomerSession } from "@/lib/auth/customer";
import { getConnectDayContext } from "@/lib/events/connectDay";
import { ConnectDayForm } from "@/components/kundenportal/ConnectDayForm";
import { ConnectDayManage } from "@/components/kundenportal/ConnectDayManage";

// Live-Zähler: die Seite darf nicht statisch gecacht werden.
export const dynamic = "force-dynamic";

const SPEAKERS = [
  { name: "Tanja Wiehoff", thema: "Copilot Studio / Agenten" },
  { name: "Raphael Köllner", thema: "Compliance / Datenschutz" },
  { name: "Michael Greth", thema: "Copilot / SharePoint" },
  { name: "Alex Eggers", thema: "Copilot / Adoption" },
];

const LEISTUNGEN = [
  { icon: BedDouble, text: "Hotelübernachtung im nhow Hotel Frankfurt" },
  { icon: UtensilsCrossed, text: "Mittagssnack & Kaffeepause Do/Fr, Abendessen" },
  {
    icon: Sparkles,
    text: "2 Stunden in der höchsten Skybar Deutschlands – freies Bier/Wein/Softdrinks",
  },
];

export default async function ConnectDayPage() {
  const session = await requireCustomerSession();
  const context = await getConnectDayContext(session.email);

  if (!context) {
    return (
      <div className="bg-white rounded-2xl border border-cool shadow-sm p-10 text-center">
        <p className="text-slate font-medium">
          Der Connect Day ist aktuell nicht verfügbar.
        </p>
      </div>
    );
  }

  const { event, eligibleBestellungen, registration, seatsFrei } = context;
  const belegt = event.capacity - seatsFrei;
  const prozent = Math.min(100, Math.round((belegt / event.capacity) * 100));
  const anmeldungOffen =
    context.isOpen &&
    !context.notYetOpen &&
    !context.deadlinePassed &&
    !context.isFull;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-slate rounded-2xl p-8 text-white">
        <p className="text-green text-sm font-semibold uppercase tracking-wider mb-2">
          Exklusiv für Klasse 1 &amp; 2
        </p>
        <h1 className="text-3xl font-bold font-heading mb-4">{event.name}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80 mb-6">
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-green" />
            10. &amp; 11. Dezember 2026 · Do 12:00 – Fr 14:00 Uhr
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green" />
            {event.ort}
          </span>
        </div>

        {/* Live-Zähler */}
        <div className="bg-slate-2 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-green" />
              {belegt} von {event.capacity} Plätzen belegt
            </span>
            <span
              className={`text-sm font-bold ${seatsFrei <= 15 ? "text-red-400" : "text-green"}`}
            >
              {seatsFrei > 0
                ? `Nur noch ${seatsFrei} ${seatsFrei === 1 ? "Platz" : "Plätze"} frei`
                : "Ausgebucht"}
            </span>
          </div>
          <div className="h-2.5 bg-slate-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${prozent >= 85 ? "bg-red-400" : "bg-green"}`}
              style={{ width: `${Math.max(prozent, 2)}%` }}
            />
          </div>
          <p className="text-xs text-white/50 mt-2">
            {context.notYetOpen
              ? "Anmeldung ab 07.07.2026, 0:00 Uhr · First Come, First Serve · bis 17.07.2026"
              : "First Come, First Serve · Verbindliche Anmeldung bis 17.07.2026"}
          </p>
        </div>
      </div>

      {/* Programm + Leistungen */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-cool shadow-sm p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate mb-4">
            <Mic2 className="w-4 h-4 text-green" />4 MVPs vor Ort – Vorträge &amp;
            Workshops
          </h2>
          <ul className="space-y-2">
            {SPEAKERS.map((s) => (
              <li key={s.name} className="text-sm">
                <span className="font-medium text-slate">{s.name}</span>{" "}
                <span className="text-gray">({s.thema})</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray mt-4">
            Dazu ist die ADN als Distributor und Sponsor des Events vor Ort.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-cool shadow-sm p-6">
          <h2 className="font-semibold text-slate mb-4">
            Im Eigenanteil enthalten
          </h2>
          <ul className="space-y-3">
            {LEISTUNGEN.map((l) => (
              <li key={l.text} className="flex items-start gap-3 text-sm text-gray">
                <l.icon className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />
                {l.text}
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-slate mt-4">
            Eigenanteil: {Number(event.preisNettoProPerson).toLocaleString("de-DE")}{" "}
            € netto pro Person · maximal {event.maxProBestellung} Personen pro
            Firma
          </p>
        </div>
      </div>

      {/* Storno-Bedingungen */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Verbindliche Buchung</p>
          <p>
            Deine Anmeldung ist eine verbindliche Buchung. Eine Absage ist
            jederzeit möglich, kostet aber <strong>399 Euro</strong>, falls wir
            den Platz nicht nachbesetzen können. Teilnehmer kannst du bis zum
            Eventbeginn kostenlos tauschen.
          </p>
        </div>
      </div>

      {/* Zustand: Anmeldung / Verwaltung / gesperrt */}
      {registration ? (
        <ConnectDayManage
          registration={{
            id: registration.id,
            personen: registration.personen,
            invoiceStatus: registration.invoiceStatus,
            bezahlt: registration.bezahltAm !== null,
            firma: registration.bestellung.firma,
            teilnehmer: registration.teilnehmer.map((t) => ({
              position: t.position,
              bestellungTeilnehmerId: t.bestellungTeilnehmerId,
              vorname: t.vorname,
              nachname: t.nachname,
              hinweise: t.hinweise,
            })),
          }}
          auswahl={
            eligibleBestellungen
              .find((b) => b.id === registration.bestellung.id)
              ?.auswaehlbareTeilnehmer.map((t) => ({
                id: t.id,
                name: `${t.vorname} ${t.nachname}`,
              })) ?? []
          }
          eventStarted={new Date() > event.startAt}
        />
      ) : eligibleBestellungen.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cool shadow-sm p-10 text-center">
          <Lock className="w-10 h-10 text-cool mx-auto mb-3" />
          <p className="text-slate font-medium">
            Der Connect Day ist exklusiv für Partner aus Klasse 1 und Klasse 2.
          </p>
          <p className="text-gray text-sm mt-1">
            Zu deiner E-Mail ({session.email}) liegt keine Bestellung in diesen
            Klassen vor. Bei Fragen melde dich gerne bei uns.
          </p>
        </div>
      ) : !anmeldungOffen ? (
        <div className="bg-white rounded-2xl border border-cool shadow-sm p-10 text-center">
          {context.notYetOpen ? (
            <>
              <CalendarDays className="w-10 h-10 text-green mx-auto mb-3" />
              <p className="text-slate font-medium">
                Die Anmeldung öffnet am 07.07.2026 um 0:00 Uhr.
              </p>
              <p className="text-gray text-sm mt-1">
                First Come, First Serve – es gibt nur 100 Plätze. Schau am
                7. Juli direkt hier vorbei und sichere dir deinen Platz.
              </p>
            </>
          ) : (
            <>
              <Lock className="w-10 h-10 text-cool mx-auto mb-3" />
              <p className="text-slate font-medium">
                {context.isFull
                  ? "Der Connect Day ist ausgebucht."
                  : "Die Anmeldung ist geschlossen."}
              </p>
              <p className="text-gray text-sm mt-1">
                {context.isFull
                  ? "Alle 100 Plätze sind vergeben. Schreib uns, wenn du auf die Nachrückliste möchtest – Stornos kommen vor."
                  : "Der Anmeldeschluss (17.07.2026) ist vorbei. Melde dich bei uns, falls du noch teilnehmen möchtest."}
              </p>
            </>
          )}
        </div>
      ) : (
        <ConnectDayForm
          bestellungen={eligibleBestellungen.map((b) => ({
            id: b.id,
            bestellNr: b.bestellNr,
            firma: b.firma,
            land: b.land,
            ustId: b.ustId,
            klasseName: b.klasse.name,
            teilnehmerSperre: b.klasse.teilnehmerSperre,
            auswaehlbareTeilnehmer: b.auswaehlbareTeilnehmer.map((t) => ({
              id: t.id,
              name: `${t.vorname} ${t.nachname}`,
              email: t.email,
            })),
          }))}
          maxPersonen={event.maxProBestellung}
          seatsFrei={seatsFrei}
          preisNettoProPerson={Number(event.preisNettoProPerson)}
        />
      )}
    </div>
  );
}
