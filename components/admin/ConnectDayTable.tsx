"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, XCircle, Loader2 } from "lucide-react";
import {
  adminStornoConnectDayAction,
  retryConnectDayInvoiceAction,
} from "@/app/admin/connect-day/actions";

interface TeilnehmerRow {
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
  angemeldetAm: string;
  stornoAm: string | null;
  teilnehmer: TeilnehmerRow[];
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
        new Date(r.angemeldetAm).toLocaleString("de-DE"),
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
              {["Firma", "Teilnehmer", "Plätze", "Brutto", "Rechnung", "Angemeldet", "Aktionen"].map(
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
                  colSpan={7}
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
                      {r.teilnehmer.map((t) => (
                        <p key={`${t.vorname}-${t.nachname}`}>
                          {t.vorname} {t.nachname}
                          {t.hinweise && (
                            <span className="text-xs text-dark-slate-400">
                              {" "}
                              ({t.hinweise})
                            </span>
                          )}
                        </p>
                      ))}
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
                    <td className="px-4 py-3 text-sm text-dark-slate-400">
                      {new Date(r.angemeldetAm).toLocaleDateString("de-DE")}
                      {r.stornoAm && (
                        <p className="text-xs">
                          Storno: {new Date(r.stornoAm).toLocaleDateString("de-DE")}
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
