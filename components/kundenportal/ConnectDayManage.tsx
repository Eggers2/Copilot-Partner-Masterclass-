"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PencilLine, XCircle } from "lucide-react";
import {
  stornoConnectDayAction,
  updateConnectDayTeilnehmerAction,
} from "@/app/kundenportal/connect-day/actions";

interface TeilnehmerRow {
  position: number;
  bestellungTeilnehmerId: number;
  vorname: string;
  nachname: string;
  hinweise: string | null;
}

interface AuswahlOption {
  id: number;
  name: string;
}

const INVOICE_LABELS: Record<string, string> = {
  PENDING: "Rechnung wird erstellt …",
  CREATED: "Rechnung erstellt – Versand folgt",
  SENT: "Rechnung per E-Mail versendet",
  FAILED: "Rechnung folgt separat per E-Mail",
};

/**
 * Verwaltungsansicht nach erfolgter Anmeldung: Teilnehmer tauschen
 * (Personenzahl bleibt fix) oder stornieren (manuelle Rechnungsabwicklung).
 */
export function ConnectDayManage({
  registration,
  auswahl,
  eventStarted,
}: {
  registration: {
    id: string;
    personen: number;
    invoiceStatus: string;
    firma: string;
    teilnehmer: TeilnehmerRow[];
  };
  auswahl: AuswahlOption[];
  eventStarted: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [stornoDialog, setStornoDialog] = useState(false);
  const [slots, setSlots] = useState<(number | "")[]>(
    registration.teilnehmer.map((t) => t.bestellungTeilnehmerId)
  );
  const [hinweise, setHinweise] = useState<string[]>(
    registration.teilnehmer.map((t) => t.hinweise ?? "")
  );
  const [error, setError] = useState<string | null>(null);

  const speichern = () => {
    setError(null);
    const ids = slots.filter((id): id is number => id !== "");
    if (ids.length !== registration.personen || new Set(ids).size !== ids.length) {
      setError("Bitte wähle für jeden Platz eine (eindeutige) Person aus.");
      return;
    }
    const hinweiseById: Record<number, string> = {};
    ids.forEach((id, index) => {
      if (hinweise[index]?.trim()) hinweiseById[id] = hinweise[index].trim();
    });

    startTransition(async () => {
      const result = await updateConnectDayTeilnehmerAction({
        registrationId: registration.id,
        teilnehmerIds: ids,
        hinweise: hinweiseById,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  };

  const stornieren = () => {
    startTransition(async () => {
      const result = await stornoConnectDayAction({
        registrationId: registration.id,
      });
      if (result.error) {
        setError(result.error);
        setStornoDialog(false);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-green/40 shadow-sm p-6">
      <div className="flex items-start gap-3 mb-5">
        <CheckCircle2 className="w-6 h-6 text-green flex-shrink-0" />
        <div>
          <h2 className="text-lg font-bold text-slate font-heading">
            Ihr seid angemeldet!
          </h2>
          <p className="text-sm text-gray">
            {registration.firma} · {registration.personen}{" "}
            {registration.personen === 1 ? "Person" : "Personen"} ·{" "}
            {INVOICE_LABELS[registration.invoiceStatus] ?? registration.invoiceStatus}
          </p>
        </div>
      </div>

      {!editing ? (
        <>
          <ul className="space-y-2 mb-5">
            {registration.teilnehmer.map((t) => (
              <li
                key={t.position}
                className="flex items-center justify-between bg-ice rounded-lg px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-slate">
                  {t.vorname} {t.nachname}
                </span>
                {t.hinweise && <span className="text-gray text-xs">{t.hinweise}</span>}
              </li>
            ))}
          </ul>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!eventStarted && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate border border-cool rounded-lg hover:border-green/50 transition-colors"
              >
                <PencilLine className="w-4 h-4" />
                Teilnehmer ändern
              </button>
              <button
                type="button"
                onClick={() => setStornoDialog(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Anmeldung stornieren
              </button>
            </div>
          )}

          {stornoDialog && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-5">
              <p className="text-sm text-red-800 font-semibold mb-2">
                Anmeldung wirklich stornieren?
              </p>
              <p className="text-sm text-red-700 mb-4">
                Die Buchung ist verbindlich: Falls wir{" "}
                {registration.personen === 1 ? "den Platz" : "die Plätze"} nicht
                nachbesetzen können, berechnen wir <strong>399 Euro</strong>.
                Tipp: Teilnehmer lassen sich bis Eventbeginn kostenlos tauschen –
                vielleicht kann jemand anderes aus eurem Team kommen?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={stornieren}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wird storniert …
                    </span>
                  ) : (
                    "Ja, verbindlich stornieren"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStornoDialog(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-slate border border-cool rounded-lg hover:bg-ice transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-gray mb-4">
            Die Personenzahl ({registration.personen}) bleibt gleich – du kannst
            nur tauschen, wer kommt. Zur Auswahl stehen die
            Masterclass-Teilnehmer deiner Bestellung.
          </p>
          <div className="space-y-3">
            {slots.map((slot, index) => (
              <div key={index} className="border border-cool rounded-xl p-4 space-y-3">
                <span className="text-sm font-medium text-slate">
                  Person {index + 1}
                </span>
                <select
                  value={slot}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s, i) =>
                        i === index
                          ? e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                          : s
                      )
                    )
                  }
                  className="w-full rounded-lg border border-cool px-3 py-2 text-sm text-slate focus:border-green focus:outline-none"
                >
                  <option value="">– Teilnehmer wählen –</option>
                  {auswahl.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      disabled={slots.includes(t.id) && slot !== t.id}
                    >
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={hinweise[index] ?? ""}
                  onChange={(e) =>
                    setHinweise((prev) =>
                      prev.map((h, i) => (i === index ? e.target.value : h))
                    )
                  }
                  placeholder="Hinweise (optional, z.B. vegetarisch, Allergien)"
                  maxLength={200}
                  className="w-full rounded-lg border border-cool px-3 py-2 text-sm text-slate placeholder:text-gray/60 focus:border-green focus:outline-none"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={speichern}
              disabled={isPending}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-green hover:bg-green-d rounded-lg transition-colors disabled:opacity-60"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird gespeichert …
                </span>
              ) : (
                "Änderungen speichern"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                setSlots(registration.teilnehmer.map((t) => t.bestellungTeilnehmerId));
                setHinweise(registration.teilnehmer.map((t) => t.hinweise ?? ""));
              }}
              disabled={isPending}
              className="px-4 py-2.5 text-sm font-medium text-slate border border-cool rounded-lg hover:bg-ice transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
