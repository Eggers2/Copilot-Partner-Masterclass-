"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2, UserRound } from "lucide-react";
import { calculateMwst } from "@/lib/packages";
import { registerConnectDayAction } from "@/app/kundenportal/connect-day/actions";

interface AuswahlOption {
  id: number;
  name: string;
  email: string;
}

interface BestellungOption {
  id: number;
  bestellNr: string;
  firma: string;
  land: string;
  ustId: string | null;
  klasseName: string;
  teilnehmerSperre: boolean;
  auswaehlbareTeilnehmer: AuswahlOption[];
}

interface Slot {
  teilnehmerId: number | "";
  hinweise: string;
}

export function ConnectDayForm({
  bestellungen,
  maxPersonen,
  seatsFrei,
  preisNettoProPerson,
  nachmeldung = false,
}: {
  bestellungen: BestellungOption[];
  /** Wie viele Personen noch angemeldet werden dürfen (Rest-Kontingent der Firma). */
  maxPersonen: number;
  seatsFrei: number;
  preisNettoProPerson: number;
  /** true = es existiert schon eine Anmeldung, hier werden Personen NACHGEMELDET (eigene Rechnung). */
  nachmeldung?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bestellungId, setBestellungId] = useState<number>(bestellungen[0].id);
  const [slots, setSlots] = useState<Slot[]>([{ teilnehmerId: "", hinweise: "" }]);
  const [stornoOk, setStornoOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bestellung = bestellungen.find((b) => b.id === bestellungId)!;
  const maxSlots = Math.min(
    maxPersonen,
    seatsFrei,
    Math.max(bestellung.auswaehlbareTeilnehmer.length, 1)
  );

  const gewaehlteIds = slots
    .map((s) => s.teilnehmerId)
    .filter((id): id is number => id !== "");

  const preis = useMemo(() => {
    const netto =
      Math.round(preisNettoProPerson * Math.max(gewaehlteIds.length, 1) * 100) /
      100;
    return calculateMwst(bestellung.land, bestellung.ustId ?? undefined, netto);
  }, [bestellung, gewaehlteIds.length, preisNettoProPerson]);

  const wechsleBestellung = (id: number) => {
    setBestellungId(id);
    setSlots([{ teilnehmerId: "", hinweise: "" }]);
    setError(null);
  };

  const setSlot = (index: number, patch: Partial<Slot>) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  };

  const submit = () => {
    setError(null);
    if (gewaehlteIds.length === 0) {
      setError("Bitte wähle mindestens eine Person aus.");
      return;
    }
    if (gewaehlteIds.length !== slots.length) {
      setError("Bitte wähle für jeden Platz eine Person aus (oder entferne leere Plätze).");
      return;
    }
    if (new Set(gewaehlteIds).size !== gewaehlteIds.length) {
      setError("Jede Person kann nur einmal angemeldet werden.");
      return;
    }
    if (!stornoOk) {
      setError("Bitte bestätige die Storno-Bedingungen.");
      return;
    }

    const hinweise: Record<number, string> = {};
    for (const slot of slots) {
      if (slot.teilnehmerId !== "" && slot.hinweise.trim()) {
        hinweise[slot.teilnehmerId] = slot.hinweise.trim();
      }
    }

    startTransition(async () => {
      const result = await registerConnectDayAction({
        bestellungId,
        teilnehmerIds: gewaehlteIds,
        hinweise,
      });
      if (result.error) {
        setError(result.error);
        router.refresh(); // Zähler aktualisieren (z.B. wenn inzwischen voll)
      } else {
        router.refresh();
      }
    });
  };

  const keineTeilnehmer = bestellung.auswaehlbareTeilnehmer.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-cool shadow-sm p-6">
      <h2 className="text-lg font-bold text-slate font-heading mb-1">
        {nachmeldung
          ? "Weitere Personen nachmelden"
          : "Jetzt verbindlich anmelden"}
      </h2>
      <p className="text-sm text-gray mb-6">
        {nachmeldung ? (
          <>
            Euer Firmen-Kontingent ist noch nicht ausgeschöpft: du kannst{" "}
            {maxPersonen === 1
              ? "noch 1 weitere Person"
              : `noch bis zu ${maxPersonen} weitere Personen`}{" "}
            anmelden, solange Plätze frei sind. Für die Nachmeldung erhaltet
            ihr eine separate Rechnung.
          </>
        ) : (
          <>
            Wähle bis zu {maxPersonen} Personen aus den
            Masterclass-Teilnehmern deiner Bestellung.
          </>
        )}
      </p>

      {bestellungen.length > 1 && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate mb-1.5">
            Bestellung
          </label>
          <select
            value={bestellungId}
            onChange={(e) => wechsleBestellung(Number(e.target.value))}
            className="w-full rounded-lg border border-cool px-3 py-2 text-sm text-slate focus:border-green focus:outline-none"
          >
            {bestellungen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.firma} · {b.bestellNr} ({b.klasseName})
              </option>
            ))}
          </select>
        </div>
      )}

      {keineTeilnehmer ? (
        <div className="bg-ice border border-green/30 rounded-xl p-4 text-sm text-slate">
          {nachmeldung
            ? "Für diese Bestellung sind keine weiteren Masterclass-Teilnehmer verfügbar – alle gepflegten Personen sind bereits angemeldet. "
            : "Für diese Bestellung sind noch keine Masterclass-Teilnehmer mit Name und E-Mail gepflegt. "}
          {bestellung.teilnehmerSperre ? (
            <>
              Die Teilnehmerliste deiner Klasse ist aktuell gesperrt – bitte
              kontaktiere uns, damit wir die Teilnehmer ergänzen.
            </>
          ) : (
            <>
              Pflege sie zuerst unter{" "}
              <Link
                href={`/kundenportal/bestellungen/${bestellung.id}`}
                className="text-green-d font-semibold underline"
              >
                Meine Bestellungen
              </Link>{" "}
              und komm dann hierher zurück.
            </>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {slots.map((slot, index) => (
              <div
                key={index}
                className="border border-cool rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate">
                    <UserRound className="w-4 h-4 text-green" />
                    Person {index + 1}
                  </span>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSlots((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="p-1 text-gray hover:text-red-500 transition-colors"
                      title="Platz entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <select
                  value={slot.teilnehmerId}
                  onChange={(e) =>
                    setSlot(index, {
                      teilnehmerId:
                        e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-cool px-3 py-2 text-sm text-slate focus:border-green focus:outline-none"
                >
                  <option value="">– Teilnehmer wählen –</option>
                  {bestellung.auswaehlbareTeilnehmer.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      disabled={
                        gewaehlteIds.includes(t.id) && slot.teilnehmerId !== t.id
                      }
                    >
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={slot.hinweise}
                  onChange={(e) => setSlot(index, { hinweise: e.target.value })}
                  placeholder="Hinweise (optional, z.B. vegetarisch, Allergien)"
                  maxLength={200}
                  className="w-full rounded-lg border border-cool px-3 py-2 text-sm text-slate placeholder:text-gray/60 focus:border-green focus:outline-none"
                />
              </div>
            ))}
          </div>

          {slots.length < maxSlots && (
            <button
              type="button"
              onClick={() =>
                setSlots((prev) => [...prev, { teilnehmerId: "", hinweise: "" }])
              }
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-d hover:text-green transition-colors"
            >
              <Plus className="w-4 h-4" />
              Weitere Person hinzufügen
            </button>
          )}

          {/* Preis-Zusammenfassung */}
          <div className="mt-6 bg-ice rounded-xl p-4 text-sm">
            <div className="flex justify-between text-slate">
              <span>
                {Math.max(gewaehlteIds.length, 1)} ×{" "}
                {preisNettoProPerson.toLocaleString("de-DE")} € netto
              </span>
              <span className="font-medium">
                {preis ? (preis.preisBrutto - preis.mwstBetrag).toLocaleString("de-DE", { minimumFractionDigits: 2 }) : ""}{" "}
                €
              </span>
            </div>
            <div className="flex justify-between text-gray mt-1">
              <span>
                {preis.reverseCharge
                  ? "Reverse Charge (0% USt)"
                  : `zzgl. ${preis.mwstSatz}% USt`}
              </span>
              <span>
                {preis.mwstBetrag.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </span>
            </div>
            <div className="flex justify-between font-bold text-slate mt-2 pt-2 border-t border-green/20">
              <span>Gesamt</span>
              <span>
                {preis.preisBrutto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </span>
            </div>
            <p className="text-xs text-gray mt-2">
              Die Rechnung wird automatisch erstellt und per E-Mail zugestellt.
            </p>
          </div>

          <label className="mt-5 flex items-start gap-3 text-sm text-slate cursor-pointer">
            <input
              type="checkbox"
              checked={stornoOk}
              onChange={(e) => setStornoOk(e.target.checked)}
              className="mt-0.5 rounded"
            />
            <span>
              Mir ist bewusst, dass die Anmeldung <strong>verbindlich</strong>{" "}
              ist. Eine Absage ist jederzeit möglich, kostet aber 399 Euro,
              falls der Platz nicht nachbesetzt werden kann.
            </span>
          </label>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="mt-5 w-full sm:w-auto px-6 py-3 bg-green hover:bg-green-d text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Wird angemeldet …
              </span>
            ) : (
              "Verbindlich anmelden"
            )}
          </button>
        </>
      )}
    </div>
  );
}
