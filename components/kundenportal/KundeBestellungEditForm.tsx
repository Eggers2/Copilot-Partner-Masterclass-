"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Users, MapPin, Lock } from "lucide-react";
import { updateKundeBestellungAction } from "@/app/kundenportal/actions";

interface Teilnehmer {
  position: number;
  vorname: string;
  nachname: string;
  email: string;
}

interface BestellungData {
  id: number;
  bestellNr: string;
  userAnzahl: number;
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
  teilnehmer: Teilnehmer[];
  showOnMap: boolean;
  klasseName: string;
  teilnehmerSperre: boolean;
}

const LAENDER: Record<string, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
};

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

export function KundeBestellungEditForm({
  bestellung,
}: {
  bestellung: BestellungData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

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
  const [showOnMap, setShowOnMap] = useState(bestellung.showOnMap);

  const slotCount = bestellung.userAnzahl;
  const teilnehmerLocked = bestellung.teilnehmerSperre;
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>(() =>
    padTeilnehmer(bestellung.teilnehmer, slotCount)
  );

  const visibleTeilnehmer = useMemo(
    () => padTeilnehmer(teilnehmer, slotCount),
    [teilnehmer, slotCount]
  );

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const result = await updateKundeBestellungAction(bestellung.id, {
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
        teilnehmer: visibleTeilnehmer,
        showOnMap,
      });

      if (result.error) {
        setFeedback({ type: "error", message: result.error });
        return;
      }

      setFeedback({ type: "success", message: "Daten erfolgreich gespeichert." });
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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

      {/* Karten-Sichtbarkeit */}
      <section className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-[#030386]" />
          <h2 className="text-base font-semibold text-dark-slate-900">
            Anzeige auf der Partner-Karte
          </h2>
        </div>
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showOnMap}
            onChange={(e) => setShowOnMap(e.target.checked)}
            disabled={isPending}
            className="mt-0.5 w-4 h-4 accent-[#030386] cursor-pointer disabled:opacity-50"
          />
          <span className="text-sm text-dark-slate-700 leading-relaxed">
            Ich stimme zu, das unsere Firma auf der Übersichtskarte unter{" "}
            <a
              href="https://www.copilotberater.de/suche"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#030386] hover:underline"
            >
              www.copilotberater.de/suche
            </a>{" "}
            angezeigt wird.
          </span>
        </label>
        <p className="text-xs text-dark-slate-400 mt-3 ml-7">
          Wenn du den Haken entfernst und speicherst, wird deine Firma weder auf der
          DACH-Landkarte noch in der Umkreissuche per PLZ oder Ort angezeigt.
        </p>
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
            <p className="text-xs text-dark-slate-400 mt-1">
              Wenn du deine E-Mail änderst, bleibst du weiterhin eingeloggt. Der
              nächste Login-Link geht dann an die neue Adresse.
            </p>
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
            Teilnehmer ({slotCount} Plätze)
          </h2>
        </div>
        <p className="text-xs text-dark-slate-400 mb-4">
          Trage hier die Namen und E-Mail-Adressen der Teilnehmer ein, die an der
          Masterclass teilnehmen sollen.
        </p>
        {teilnehmerLocked && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800"
          >
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Teilnehmerliste für {bestellung.klasseName} gesperrt
              </p>
              <p className="text-xs mt-0.5">
                Die Klasse läuft bereits. Bitte kontaktiere uns, wenn du noch
                Änderungen an den Teilnehmern vornehmen möchtest – wir
                schalten die Bearbeitung dann kurz für dich frei.
              </p>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {visibleTeilnehmer.map((t) => (
            <div
              key={t.position}
              className="grid grid-cols-1 md:grid-cols-[24px_1fr_1fr_1.5fr] gap-3 items-end p-3 rounded-lg border border-dark-slate-100 bg-dark-slate-50/40"
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
                  disabled={isPending || teilnehmerLocked}
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
                  disabled={isPending || teilnehmerLocked}
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
                  disabled={isPending || teilnehmerLocked}
                  className={inputClass}
                />
              </div>
            </div>
          ))}
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
          onClick={() => router.push("/kundenportal/bestellungen")}
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
