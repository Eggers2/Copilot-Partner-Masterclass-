"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Users, Plus, Minus } from "lucide-react";
import type { AdnChannel } from "@prisma/client";
import { updateBestellungAction } from "@/app/admin/actions";
import { PACKAGES } from "@/lib/packages";
import { ADN_CHANNEL_CONFIG } from "@/lib/constants/lead-config";

interface Teilnehmer {
  position: number;
  vorname: string;
  nachname: string;
  email: string;
}

interface KlasseChoice {
  id: string;
  name: string;
}

interface BestellungData {
  id: number;
  bestellNr: string;
  paket: string;
  userAnzahl: number;
  zahlungsmodell: string;
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  ustId: string | null;
  website: string | null;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string | null;
  position: string | null;
  anmerkungen: string | null;
  status: string;
  teilnehmer: Teilnehmer[];
  adnChannel: AdnChannel;
  klasseId: string;
}

const LAENDER: Record<string, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
};

const STATUS_OPTIONS = [
  { value: "neu", label: "Neu" },
  { value: "bearbeitet", label: "Bearbeitet" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
];

const inputClass =
  "w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none disabled:opacity-50 bg-white text-dark-slate-900";

const labelClass = "block text-xs font-medium text-dark-slate-600 mb-1";

function padTeilnehmer(list: Teilnehmer[], size: number): Teilnehmer[] {
  const map = new Map(list.map((t) => [t.position, t]));
  const result: Teilnehmer[] = [];
  for (let i = 0; i < size; i++) {
    result.push(
      map.get(i) ?? { position: i, vorname: "", nachname: "", email: "" }
    );
  }
  return result;
}

export function BestellungEditForm({
  bestellung,
  klassen,
}: {
  bestellung: BestellungData;
  klassen: KlasseChoice[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const [paket, setPaket] = useState(bestellung.paket);
  const [zahlungsmodell, setZahlungsmodell] = useState(bestellung.zahlungsmodell);
  const [firma, setFirma] = useState(bestellung.firma);
  const [strasse, setStrasse] = useState(bestellung.strasse);
  const [plz, setPlz] = useState(bestellung.plz);
  const [ort, setOrt] = useState(bestellung.ort);
  const [land, setLand] = useState(bestellung.land);
  const [ustId, setUstId] = useState(bestellung.ustId ?? "");
  const [website, setWebsite] = useState(bestellung.website ?? "");
  const [vorname, setVorname] = useState(bestellung.vorname);
  const [nachname, setNachname] = useState(bestellung.nachname);
  const [email, setEmail] = useState(bestellung.email);
  const [telefon, setTelefon] = useState(bestellung.telefon ?? "");
  const [positionRole, setPositionRole] = useState(bestellung.position ?? "");
  const [anmerkungen, setAnmerkungen] = useState(bestellung.anmerkungen ?? "");
  const [status, setStatus] = useState(bestellung.status);
  const [adnChannel, setAdnChannel] = useState<AdnChannel>(bestellung.adnChannel);
  const [klasseId, setKlasseId] = useState<string>(bestellung.klasseId);

  const paketInfo = PACKAGES[paket as keyof typeof PACKAGES] ?? PACKAGES.starter;

  const [slotCount, setSlotCount] = useState<number>(() => {
    // Gespeicherte Platzanzahl respektieren – sie kann vom Admin auch unter
    // die Paketgröße reduziert worden sein (mindestens ein Platz).
    const maxPosition = bestellung.teilnehmer.reduce(
      (m, t) => Math.max(m, t.position + 1),
      0
    );
    return Math.max(1, bestellung.userAnzahl, maxPosition);
  });

  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>(() =>
    padTeilnehmer(bestellung.teilnehmer, slotCount)
  );

  const visibleTeilnehmer = useMemo(
    () => padTeilnehmer(teilnehmer, slotCount),
    [teilnehmer, slotCount]
  );

  // Der letzte Platz lässt sich nur entfernen, wenn er leer ist – so gehen
  // bereits erfasste Teilnehmerdaten nicht versehentlich verloren.
  const lastSlot = visibleTeilnehmer[visibleTeilnehmer.length - 1];
  const lastSlotEmpty =
    !lastSlot ||
    (!lastSlot.vorname.trim() &&
      !lastSlot.nachname.trim() &&
      !lastSlot.email.trim());
  const canReduce = slotCount > 1 && lastSlotEmpty;

  const updateTeilnehmer = (
    position: number,
    field: "vorname" | "nachname" | "email",
    value: string
  ) => {
    setTeilnehmer((prev) => {
      const map = new Map(prev.map((t) => [t.position, t]));
      const existing = map.get(position) ?? {
        position,
        vorname: "",
        nachname: "",
        email: "",
      };
      map.set(position, { ...existing, [field]: value });
      return Array.from(map.values()).sort((a, b) => a.position - b.position);
    });
  };

  const handlePaketChange = (newPaket: string) => {
    setPaket(newPaket);
    const newPaketUsers =
      PACKAGES[newPaket as keyof typeof PACKAGES]?.users ?? paketInfo.users;
    setSlotCount((prev) => {
      const next = Math.max(prev, newPaketUsers);
      setTeilnehmer((prevList) => padTeilnehmer(prevList, next));
      return next;
    });
  };

  const addTeilnehmerRow = () => {
    setSlotCount((prev) => prev + 1);
  };

  const removeTeilnehmerRow = (position: number) => {
    setTeilnehmer((prev) =>
      prev
        .filter((t) => t.position !== position)
        .map((t) =>
          t.position > position ? { ...t, position: t.position - 1 } : t
        )
    );
    setSlotCount((prev) => Math.max(1, prev - 1));
  };

  // Symmetrisch zum Hinzufügen: entfernt den letzten (leeren) Platz. Es bleibt
  // immer mindestens ein Platz bestehen; Paket und Preis ändern sich nicht.
  const removeLastTeilnehmerRow = () => {
    if (!canReduce) return;
    removeTeilnehmerRow(slotCount - 1);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const result = await updateBestellungAction(bestellung.id, {
        paket,
        userAnzahl: slotCount,
        zahlungsmodell,
        firma,
        strasse,
        plz,
        ort,
        land,
        ustId: ustId || null,
        website: website.trim() || null,
        vorname,
        nachname,
        email,
        telefon: telefon || null,
        position: positionRole || null,
        anmerkungen: anmerkungen || null,
        status,
        teilnehmer: visibleTeilnehmer,
        adnChannel,
        klasseId,
      });

      if (result.error) {
        setFeedback({ type: "error", message: result.error });
        return;
      }

      setFeedback({ type: "success", message: "Bestellung gespeichert." });
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Paket & Zahlung */}
      <section className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-dark-slate-900 mb-4">
          Paket & Zahlung
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Paket</label>
            <select
              value={paket}
              onChange={(e) => handlePaketChange(e.target.value)}
              disabled={isPending}
              className={inputClass}
            >
              {(Object.keys(PACKAGES) as (keyof typeof PACKAGES)[]).map((k) => (
                <option key={k} value={k}>
                  {PACKAGES[k].label} ({PACKAGES[k].users} User)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Zahlungsmodell</label>
            <select
              value={zahlungsmodell}
              onChange={(e) => setZahlungsmodell(e.target.value)}
              disabled={isPending}
              className={inputClass}
            >
              <option value="jahresabo">Jahresabo</option>
              <option value="monatlich">Monatlich</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isPending}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>ADN-Kanal</label>
            <select
              value={adnChannel}
              onChange={(e) => setAdnChannel(e.target.value as AdnChannel)}
              disabled={isPending}
              className={inputClass}
            >
              {Object.entries(ADN_CHANNEL_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Klasse *</label>
            <select
              value={klasseId}
              onChange={(e) => setKlasseId(e.target.value)}
              disabled={isPending}
              className={inputClass}
            >
              {klassen.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-dark-slate-400 mt-3">
          Preis und MwSt werden beim Speichern automatisch anhand von Paket,
          Zahlungsmodell, Land, USt-IdNr. und ADN-Kanal neu berechnet.
        </p>
      </section>

      {/* Unternehmen */}
      <section className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-dark-slate-900 mb-4">
          Unternehmen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Firma *</label>
            <input
              type="text"
              required
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Straße + Hausnummer</label>
            <input
              type="text"
              value={strasse}
              onChange={(e) => setStrasse(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>PLZ</label>
            <input
              type="text"
              value={plz}
              onChange={(e) => setPlz(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Ort</label>
            <input
              type="text"
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Land</label>
            <select
              value={land}
              onChange={(e) => setLand(e.target.value)}
              disabled={isPending}
              className={inputClass}
            >
              {Object.entries(LAENDER).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>USt-IdNr.</label>
            <input
              type="text"
              value={ustId}
              onChange={(e) => setUstId(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>
              Website (für Anzeige auf der Partner-Karte)
            </label>
            <input
              type="text"
              placeholder="https://www.firma.de"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Ansprechpartner */}
      <section className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-dark-slate-900 mb-4">
          Ansprechpartner
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Vorname *</label>
            <input
              type="text"
              required
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Nachname *</label>
            <input
              type="text"
              required
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>E-Mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Telefon</label>
            <input
              type="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Position / Rolle</label>
            <input
              type="text"
              value={positionRole}
              onChange={(e) => setPositionRole(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Teilnehmer */}
      <section className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-[#030386]" />
          <h2 className="text-base font-semibold text-dark-slate-900">
            Teilnehmer ({slotCount} {slotCount === 1 ? "Platz" : "Plätze"})
          </h2>
        </div>
        <p className="text-xs text-dark-slate-400 mb-4">
          Das Paket {paketInfo.label} enthält {paketInfo.users} User-Plätze.
          Aktuell {slotCount === 1 ? "ist 1 Platz" : `sind ${slotCount} Plätze`}{" "}
          angelegt. Die Anzahl lässt sich über die Buttons unten anpassen –
          unabhängig von Paket und Preis und mindestens bis auf einen Platz.
        </p>
        <div className="space-y-3">
          {visibleTeilnehmer.map((t) => {
            const isEmpty =
              !t.vorname.trim() && !t.nachname.trim() && !t.email.trim();
            const canRemove = isEmpty && slotCount > 1;
            return (
              <div
                key={t.position}
                className="grid grid-cols-1 md:grid-cols-[24px_1fr_1fr_1.5fr_32px] gap-3 items-end p-3 rounded-lg border border-dark-slate-100 bg-dark-slate-50/40"
              >
                <div className="text-xs font-mono text-dark-slate-400 md:pb-2">
                  #{t.position + 1}
                </div>
                <div>
                  <label className={labelClass}>Vorname</label>
                  <input
                    type="text"
                    value={t.vorname}
                    onChange={(e) =>
                      updateTeilnehmer(t.position, "vorname", e.target.value)
                    }
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Nachname</label>
                  <input
                    type="text"
                    value={t.nachname}
                    onChange={(e) =>
                      updateTeilnehmer(t.position, "nachname", e.target.value)
                    }
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>E-Mail</label>
                  <input
                    type="email"
                    value={t.email}
                    onChange={(e) =>
                      updateTeilnehmer(t.position, "email", e.target.value)
                    }
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
                <div className="flex md:justify-center md:pb-1">
                  {canRemove ? (
                    <button
                      type="button"
                      onClick={() => removeTeilnehmerRow(t.position)}
                      disabled={isPending}
                      aria-label={`Zeile #${t.position + 1} entfernen`}
                      title="Leere Zeile entfernen"
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-dark-slate-200 text-dark-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addTeilnehmerRow}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#030386] bg-white border border-[#030386]/30 rounded-lg hover:bg-[#030386]/5 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Weiteren Teilnehmer hinzufügen
            </button>
            <button
              type="button"
              onClick={removeLastTeilnehmerRow}
              disabled={isPending || !canReduce}
              title={
                slotCount <= 1
                  ? "Mindestens ein Platz muss bestehen bleiben."
                  : !lastSlotEmpty
                    ? "Der letzte Platz enthält noch Teilnehmerdaten. Bitte zuerst leeren, dann lässt er sich entfernen."
                    : "Letzten Platz entfernen"
              }
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-dark-slate-600 bg-white border border-dark-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-dark-slate-600 disabled:hover:border-dark-slate-200"
            >
              <Minus className="w-3.5 h-3.5" />
              Platz entfernen
            </button>
          </div>
          <p className="text-xs text-dark-slate-400 mt-2">
            Das Paket und der Preis ändern sich dadurch nicht — es wird lediglich
            ein Platz freigeschaltet bzw. entfernt (mindestens 1 Platz).
          </p>
        </div>
      </section>

      {/* Anmerkungen */}
      <section className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-dark-slate-900 mb-4">
          Anmerkungen
        </h2>
        <textarea
          rows={4}
          maxLength={2000}
          value={anmerkungen}
          onChange={(e) => setAnmerkungen(e.target.value)}
          disabled={isPending}
          className={`${inputClass} resize-none`}
        />
      </section>

      {feedback && (
        <div
          role="alert"
          className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
            feedback.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/shop")}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-dark-slate-600 bg-white border border-dark-slate-200 rounded-lg hover:bg-dark-slate-50 transition-colors disabled:opacity-50"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#030386] rounded-lg hover:bg-[#030386]/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Speichern…" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}
