"use client";

import { useState, useTransition } from "react";
import { Send, Loader2, CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import { sendConnectDayEinladungAction } from "@/app/admin/connect-day/actions";

/**
 * Versand der Connect-Day-Einladung aus dem Admin: erst Test-Mail an eine
 * frei wählbare Adresse, dann – mit Sicherheitsabfrage – Vollversand an alle
 * Besteller/Koordinatoren von Klasse 1 & 2.
 */
export function ConnectDayEinladung({
  empfaengerAnzahl,
  defaultTestEmail,
}: {
  empfaengerAnzahl: number;
  defaultTestEmail: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [testEmail, setTestEmail] = useState(defaultTestEmail);
  const [confirmLive, setConfirmLive] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const sendTest = () => {
    setResult(null);
    startTransition(async () => {
      const r = await sendConnectDayEinladungAction(testEmail);
      setResult({
        ok: r.ok,
        text: r.ok
          ? `Test-Mail an ${testEmail} verschickt.`
          : `Test fehlgeschlagen: ${r.error ?? "unbekannter Fehler"}`,
      });
    });
  };

  const sendLive = () => {
    setResult(null);
    setConfirmLive(false);
    startTransition(async () => {
      const r = await sendConnectDayEinladungAction();
      setResult({
        ok: r.ok,
        text: r.ok
          ? `Einladung an ${r.sent} von ${r.total} Koordinatoren verschickt.`
          : `Versand fehlgeschlagen: ${r.error ?? "unbekannter Fehler"}`,
      });
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-5 h-5 text-[#030386]" />
        <h3 className="font-semibold text-dark-slate-900">
          Einladung versenden
        </h3>
      </div>
      <p className="text-sm text-dark-slate-500 mb-4">
        Werbe-Mail an die <strong>{empfaengerAnzahl}</strong>{" "}
        Besteller/Koordinatoren von Klasse 1 &amp; 2. Bitte zuerst eine
        Test-Mail an dich selbst senden.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-dark-slate-500 mb-1">
            Test-Adresse
          </label>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="du@example.com"
            className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={sendTest}
          disabled={isPending || !testEmail.includes("@")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#030386] bg-[#E3ECF8] rounded-lg hover:bg-[#d5e3f5] disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Test-Mail senden
        </button>
      </div>

      <div className="border-t border-dark-slate-100 pt-3">
        {!confirmLive ? (
          <button
            onClick={() => setConfirmLive(true)}
            disabled={isPending || empfaengerAnzahl === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
            style={{ background: "#00C896" }}
          >
            <Send className="w-4 h-4" />
            An alle {empfaengerAnzahl} Koordinatoren senden
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-800 font-medium">
              Wirklich an alle {empfaengerAnzahl} Empfänger senden?
            </span>
            <button
              onClick={sendLive}
              disabled={isPending}
              className="px-3 py-1.5 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? "Sende …" : "Ja, jetzt senden"}
            </button>
            <button
              onClick={() => setConfirmLive(false)}
              disabled={isPending}
              className="px-3 py-1.5 text-sm text-dark-slate-600 hover:text-dark-slate-900"
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>

      {result && (
        <div
          className={`mt-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
            result.ok
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {result.text}
        </div>
      )}
    </div>
  );
}
