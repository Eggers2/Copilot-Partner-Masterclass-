import { redirect } from "next/navigation";
import {
  Users,
  Euro,
  FileWarning,
  AlertTriangle,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONNECT_DAY_SLUG } from "@/lib/events/connectDay";
import { getEinladungEmpfaenger } from "@/lib/events/connectDayInvite";
import { ConnectDayTable } from "@/components/admin/ConnectDayTable";
import { ConnectDayFreischaltung } from "@/components/admin/ConnectDayFreischaltung";
import { ConnectDayEinladung } from "@/components/admin/ConnectDayEinladung";

export const dynamic = "force-dynamic";

export default async function AdminConnectDayPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const event = await prisma.event.findUnique({
    where: { slug: CONNECT_DAY_SLUG },
  });
  if (!event) {
    return (
      <div className="bg-white rounded-2xl border border-dark-slate-100 p-12 shadow-sm text-center">
        <p className="text-dark-slate-500 text-sm">
          Das Connect-Day-Event existiert noch nicht (Migration ausführen).
        </p>
      </div>
    );
  }

  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId: event.id },
    include: {
      bestellung: { select: { firma: true, bestellNr: true, email: true } },
      teilnehmer: { orderBy: { position: "asc" } },
    },
    orderBy: { erstelltAm: "desc" },
  });

  const confirmed = registrations.filter((r) => r.status === "CONFIRMED");
  const personenGesamt = confirmed.reduce((sum, r) => sum + r.personen, 0);
  const umsatzNetto = confirmed.reduce(
    (sum, r) => sum + Number(r.preisNetto),
    0
  );
  const invoiceProblem = confirmed.filter(
    (r) => r.invoiceStatus === "FAILED" || r.invoiceStatus === "PENDING"
  ).length;
  const bezahlt = confirmed.filter((r) => r.bezahltAm !== null).length;
  const zahlungOffen = confirmed.length - bezahlt;
  // Konsistenz: der atomare Zähler muss zur Summe der bestätigten Plätze passen.
  const zaehlerKonsistent = event.seatsTaken === personenGesamt;
  const einladungEmpfaenger = await getEinladungEmpfaenger();
  const startErreicht =
    !event.anmeldestart || new Date() >= event.anmeldestart;
  const anmeldestartLabel = event.anmeldestart
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      }).format(event.anmeldestart) + " Uhr"
    : "sofort";

  return (
    <div>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dark-slate-900">
          <CalendarDays className="w-6 h-6 text-[#030386]" />
          {event.name}
        </h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          10./11.12.2026 · {event.ort} · Anmeldeschluss{" "}
          {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(
            event.anmeldeschluss
          )}{" "}
          · Status: {event.status}
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <ConnectDayFreischaltung
          manuellFreigeschaltet={event.manuellFreigeschaltet}
          anmeldestartLabel={anmeldestartLabel}
          startErreicht={startErreicht}
        />
        <ConnectDayEinladung
          empfaengerAnzahl={einladungEmpfaenger.length}
          defaultTestEmail={
            process.env.CONNECT_DAY_NOTIFY_EMAIL ??
            process.env.NEWSLETTER_REVIEW_EMAIL ??
            ""
          }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-dark-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <Users className="w-4 h-4" />
            Belegung
          </div>
          <p className="text-2xl font-bold text-dark-slate-900">
            {event.seatsTaken}
            <span className="text-base font-medium text-dark-slate-400">
              {" "}
              / {event.capacity}
            </span>
          </p>
          <div className="mt-2 h-1.5 bg-dark-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#030386] rounded-full"
              style={{
                width: `${Math.min(100, Math.round((event.seatsTaken / event.capacity) * 100))}%`,
              }}
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-dark-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <Users className="w-4 h-4" />
            Anmeldungen
          </div>
          <p className="text-2xl font-bold text-dark-slate-900">
            {confirmed.length}
          </p>
          <p className="text-xs text-dark-slate-400 mt-1">
            {registrations.length - confirmed.length} storniert
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-dark-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <Euro className="w-4 h-4" />
            Umsatz (netto)
          </div>
          <p className="text-2xl font-bold text-dark-slate-900">
            {umsatzNetto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-dark-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <FileWarning className="w-4 h-4" />
            Rechnungen offen
          </div>
          <p
            className={`text-2xl font-bold ${invoiceProblem > 0 ? "text-red-600" : "text-dark-slate-900"}`}
          >
            {invoiceProblem}
          </p>
          <p className="text-xs text-dark-slate-400 mt-1">
            fehlgeschlagen oder ausstehend
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-dark-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <Wallet className="w-4 h-4" />
            Zahlungen
          </div>
          <p className="text-2xl font-bold text-dark-slate-900">
            {bezahlt}
            <span className="text-base font-medium text-dark-slate-400">
              {" "}
              / {confirmed.length}
            </span>
          </p>
          <p
            className={`text-xs mt-1 ${zahlungOffen > 0 ? "text-red-600 font-semibold" : "text-dark-slate-400"}`}
          >
            {zahlungOffen > 0 ? `${zahlungOffen} offen!` : "alle bezahlt"}
          </p>
        </div>
      </div>

      {!zaehlerKonsistent && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            <strong>Zähler-Inkonsistenz:</strong> events.seats_taken (
            {event.seatsTaken}) weicht von der Summe der bestätigten Plätze (
            {personenGesamt}) ab. Bitte prüfen (manuelle DB-Änderung?).
          </p>
        </div>
      )}

      <ConnectDayTable
        eventName={event.name}
        registrations={registrations.map((r) => ({
          id: r.id,
          status: r.status,
          firma: r.bestellung.firma,
          bestellNr: r.bestellung.bestellNr,
          email: r.bestellung.email,
          personen: r.personen,
          preisBrutto: Number(r.preisBrutto),
          invoiceStatus: r.invoiceStatus,
          sevdeskInvoiceNr: r.sevdeskInvoiceNr,
          invoiceError: r.invoiceError,
          bezahltAm: r.bezahltAm?.toISOString() ?? null,
          angemeldetAm: r.erstelltAm.toISOString(),
          stornoAm: r.stornoAm?.toISOString() ?? null,
          teilnehmer: r.teilnehmer.map((t) => ({
            vorname: t.vorname,
            nachname: t.nachname,
            email: t.email,
            hinweise: t.hinweise,
          })),
        }))}
      />
    </div>
  );
}
