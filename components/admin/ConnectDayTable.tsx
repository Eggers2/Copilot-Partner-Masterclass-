"use client";

import { useState } from "react";
import { formatBerlinDate, formatBerlinDateTime } from "@/lib/datetime";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, XCircle, Loader2, Wallet, Undo2, Pencil } from "lucide-react";
import {
  adminStornoConnectDayAction,
  adminUpdateConnectDayTeilnehmerAction,
  markConnectDayBezahltAction,
  retryConnectDayInvoiceAction,
} from "@/app/admin/connect-day/actions";

interface TeilnehmerRow {
  id: string;
  bestellungTeilnehmerId: number;
  vorname: string;
  nachname: string;
  email: string;
  hinweise: string | null;
}

interface RegistrationRow {
  id: string;
  status: string;
  firma: string;
  bestellNr: string;
  email: string;
  personen: number;
  preisBrutto: number;
  invoiceStatus: string;
  sevdeskInvoiceNr: string | null;
  invoiceError: string | null;
  bezahltAm: string | null;
  angemeldetAm: string;
  stornoAm: string | null;
  bestellungTeilnehmer: BestellungTeilnehmerOption[];
  belegtAnderswo: number[];
  teilnehmer: TeilnehmerRow[];
}

interface BestellungTeilnehmerOption {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
}

interface EditForm {
  eventTeilnehmerId: string;
  bestellungTeilnehmerId: number;
  vorname: string;
  nachname: string;
  email: string;
  hinweise: string;
}

const INVOICE_BADGES: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Ausstehend", className: "bg-amber-50 text-amber-700 border-amber-200" },
  CREATED: { label: "Erstellt", className: "bg-blue-50 text-blue-700 border-blue-200" },
  SENT: { label: "Versendet", className: "bg-green-50 text-green-700 border-green-200" },
  FAILED: { label: "Fehler", className: "bg-red-50 text-red-700 border-red-200" },
};

export function ConnectDayTable({
  eventName,
  registrations,
}: {
  eventName: string;
  registrations: RegistrationRow[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [stornoId, setStornoId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (t: TeilnehmerRow) => {
    setEditError(null);
    setEdit({
      eventTeilnehmerId: t.id,
      bestellungTeilnehmerId: t.bestellungTeilnehmerId,
      vorname: t.vorname,
      nachname: t.nachname,
      email: t.email,
      hinweise: t.hinweise ?? "",
    });
  };

  // Andere Person aus der Bestellung gewählt: Felder mit deren Daten füllen.
  const waehlePerson = (r: RegistrationRow, id: number) => {
    if (!edit) return;
    const p = r.bestellungTeilnehmer.find((o) => o.id === id);
    if (!p) return;
    const istAktuell = r.teilnehmer.some(
      (t) => t.id === edit.eventTeilnehmerId && t.bestellungTeilnehmerId === id
    );
    const aktuell = r.teilnehmer.find((t) => t.id === edit.eventTeilnehmerId);
    setEdit({
      ...edit,
      bestellungTeilnehmerId: id,
      vorname: istAktuell && aktuell ? aktuell.vorname : p.vorname,
      nachname: istAktuell && aktuell ? aktuell.nachname : p.nachname,
      email: istAktuell && aktuell ? aktuell.email : p.email,
      hinweise: istAktuell && aktuell ? aktuell.hinweise ?? "" : "",
    });
  };

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    setEditError(null);
    const result = await adminUpdateConnectDayTeilnehmerAction(edit);
    setSaving(false);
    if (result.error) {
      setEditError(result.error);
      return;
    }
    setEdit(null);
    router.refresh();
  };

  const retryInvoice = async (id: string) => {
    setLoading(id);
    await retryConnectDayInvoiceAction(id);
    setLoading(null);
    router.refresh();
  };

  const storno = async (id: string) => {
    setLoading(id);
    await adminStornoConnectDayAction(id, "Storno durch Admin");
    setLoading(null);
    setStornoId(null);
    router.refresh();
  };

  const toggleBezahlt = async (id: string, bezahlt: boolean) => {
    setLoading(id);
    await markConnectDayBezahltAction(id, bezahlt);
    setLoading(null);
    router.refresh();
  };

  // CSV: eine Zeile pro Teilnehmer – direkt verwendbar für Hotel/Catering.
  const downloadCSV = () => {
    const headers = [
      "Firma",
      "Bestell-Nr",
      "Kontakt-E-Mail",
      "Vorname",
      "Nachname",
      "Teilnehmer-E-Mail",
      "Hinweise",
      "Status",
      "Rechnung",
      "Rechnungs-Nr",
      "Bezahlt am",
      "Angemeldet am",
    ];
    const rows = registrations.flatMap((r) =>
      r.teilnehmer.map((t) => [
        r.firma,
        r.bestellNr,
        r.email,
        t.vorname,
        t.nachname,
        t.email,
        t.hinweise ?? "",
        r.status === "CONFIRMED" ? "Angemeldet" : "Storniert",
        INVOICE_BADGES[r.invoiceStatus]?.label ?? r.invoiceStatus,
        r.sevdeskInvoiceNr ?? "",
        r.bezahltAm ? formatBerlinDate(r.bezahltAm) : "offen",
        formatBerlinDateTime(r.angemeldetAm, ""),
      ])
    );

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventName.replace(/\s+/g, "-")}_teilnehmer.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-dark-slate-100 flex items-center gap-3">
        <p className="text-sm text-dark-slate-500">
          {registrations.length} Anmeldung{registrations.length !== 1 ? "en" : ""}{" "}
          (inkl. Stornos)
        </p>
        <div className="ml-auto">
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-dark-slate-600 bg-white border border-dark-slate-200 rounded-lg hover:bg-dark-slate-50"
          >
            <Download className="w-3 h-3" />
            CSV (Teilnehmerliste)
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-slate-50 border-b border-dark-slate-100">
              {["Firma", "Teilnehmer", "Plätze", "Brutto", "Rechnung", "Zahlung", "Angemeldet", "Aktionen"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-slate-50">
            {registrations.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-dark-slate-400 text-sm"
                >
                  Noch keine Anmeldungen.
                </td>
              </tr>
            ) : (
              registrations.map((r) => {
                const badge =
                  INVOICE_BADGES[r.invoiceStatus] ?? {
                    label: r.invoiceStatus,
                    className: "bg-dark-slate-50 text-dark-slate-500 border-dark-slate-200",
                  };
                const storniert = r.status !== "CONFIRMED";
                return (
                  <tr
                    key={r.id}
                    className={storniert ? "opacity-50" : "hover:bg-[#E3ECF8]/20"}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-dark-slate-900">
                        {r.firma}
                        {storniert && (
                          <span className="ml-2 text-xs font-semibold text-red-500">
                            STORNIERT
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-dark-slate-400">
                        {r.bestellNr} · {r.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-slate-600">
                      {r.teilnehmer.map((t) =>
                        edit?.eventTeilnehmerId === t.id ? (
                          <TeilnehmerEditForm
                            key={t.id}
                            form={edit}
                            optionen={r.bestellungTeilnehmer}
                            gesperrt={
                              new Set([
                                ...r.belegtAnderswo,
                                ...r.teilnehmer
                                  .filter((o) => o.id !== t.id)
                                  .map((o) => o.bestellungTeilnehmerId),
                              ])
                            }
                            error={editError}
                            saving={saving}
                            onChange={setEdit}
                            onPerson={(id) => waehlePerson(r, id)}
                            onSave={saveEdit}
                            onCancel={() => setEdit(null)}
                          />
                        ) : (
                          <p key={t.id} className="group flex items-start gap-1">
                            <span>
                              {t.vorname} {t.nachname}
                              {t.hinweise && (
                                <span className="text-xs text-dark-slate-400">
                                  {" "}
                                  ({t.hinweise})
                                </span>
                              )}
                              <span className="block text-xs text-dark-slate-400">
                                {t.email}
                              </span>
                            </span>
                            {!storniert && (
                              <button
                                onClick={() => startEdit(t)}
                                disabled={saving}
                                className="p-1 rounded text-dark-slate-400 hover:text-[#030386] hover:bg-[#E3ECF8]/50 disabled:opacity-30"
                                title="Teilnehmer ändern"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </p>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-slate-600">
                      {r.personen}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-slate-600">
                      {r.preisBrutto.toLocaleString("de-DE", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      €
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}
                        title={r.invoiceError ?? undefined}
                      >
                        {badge.label}
                      </span>
                      {r.sevdeskInvoiceNr && (
                        <p className="text-xs text-dark-slate-400 mt-0.5">
                          {r.sevdeskInvoiceNr}
                        </p>
                      )}
                      {r.invoiceError && (
                        <p className="text-xs text-red-500 mt-0.5 max-w-xs whitespace-pre-wrap break-words">
                          {r.invoiceError}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {storniert ? (
                        <span className="text-xs text-dark-slate-400">–</span>
                      ) : r.bezahltAm ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-50 text-green-700 border-green-200">
                            Bezahlt {formatBerlinDate(r.bezahltAm)}
                          </span>
                          <button
                            onClick={() => toggleBezahlt(r.id, false)}
                            disabled={loading === r.id}
                            className="p-1 rounded text-dark-slate-400 hover:bg-dark-slate-50 disabled:opacity-30"
                            title="Zahlung zurücknehmen"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleBezahlt(r.id, true)}
                          disabled={loading === r.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                          title="Zahlungseingang abhaken"
                        >
                          {loading === r.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Wallet className="w-3 h-3" />
                          )}
                          Offen – abhaken
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-slate-400">
                      {formatBerlinDate(r.angemeldetAm)}
                      {r.stornoAm && (
                        <p className="text-xs">
                          Storno: {formatBerlinDate(r.stornoAm)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!storniert && (
                        <div className="flex items-center gap-1">
                          {r.invoiceStatus !== "SENT" && (
                            <button
                              onClick={() => retryInvoice(r.id)}
                              disabled={loading === r.id}
                              className="p-1.5 rounded text-[#030386] hover:bg-[#E3ECF8]/50 disabled:opacity-30 transition-colors"
                              title="Rechnung erneut anstoßen"
                            >
                              {loading === r.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {stornoId === r.id ? (
                            <span className="flex items-center gap-1">
                              <button
                                onClick={() => storno(r.id)}
                                disabled={loading === r.id}
                                className="px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                Sicher?
                              </button>
                              <button
                                onClick={() => setStornoId(null)}
                                className="px-2 py-1 text-xs text-dark-slate-500 hover:text-dark-slate-900"
                              >
                                Nein
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setStornoId(r.id)}
                              disabled={loading === r.id}
                              className="p-1.5 rounded text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                              title="Anmeldung stornieren (Plätze werden frei)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeilnehmerEditForm({
  form,
  optionen,
  gesperrt,
  error,
  saving,
  onChange,
  onPerson,
  onSave,
  onCancel,
}: {
  form: EditForm;
  optionen: BestellungTeilnehmerOption[];
  gesperrt: Set<number>;
  error: string | null;
  saving: boolean;
  onChange: (f: EditForm) => void;
  onPerson: (id: number) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const input =
    "w-full px-2 py-1 text-xs border border-dark-slate-200 rounded focus:outline-none focus:border-[#030386]";
  return (
    <div className="my-1 p-2 rounded-lg border border-[#030386]/30 bg-[#E3ECF8]/30 space-y-1.5 min-w-[260px]">
      <label className="block text-xs text-dark-slate-500">
        Person aus der Bestellung
        <select
          className={input}
          value={form.bestellungTeilnehmerId}
          onChange={(e) => onPerson(Number(e.target.value))}
        >
          {optionen.map((o) => (
            <option
              key={o.id}
              value={o.id}
              disabled={gesperrt.has(o.id) && o.id !== form.bestellungTeilnehmerId}
            >
              {`${o.vorname} ${o.nachname}`.trim() || o.email || `Platz ${o.id}`}
              {gesperrt.has(o.id) ? " (schon angemeldet)" : ""}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[11px] text-dark-slate-400">
        Für eine Ersatzperson außerhalb der Liste die Felder unten einfach
        überschreiben.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <input
          className={input}
          placeholder="Vorname"
          value={form.vorname}
          onChange={(e) => onChange({ ...form, vorname: e.target.value })}
        />
        <input
          className={input}
          placeholder="Nachname"
          value={form.nachname}
          onChange={(e) => onChange({ ...form, nachname: e.target.value })}
        />
      </div>
      <input
        className={input}
        type="email"
        placeholder="E-Mail"
        value={form.email}
        onChange={(e) => onChange({ ...form, email: e.target.value })}
      />
      <input
        className={input}
        placeholder="Hinweise (z. B. Ernährung)"
        value={form.hinweise}
        onChange={(e) => onChange({ ...form, hinweise: e.target.value })}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-[#030386] rounded hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Speichern
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-2 py-1 text-xs text-dark-slate-500 hover:text-dark-slate-900"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
