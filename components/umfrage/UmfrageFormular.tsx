"use client";

import { useMemo, useState } from "react";
import {
  ANONYM_HINWEIS,
  ANONYM_LABEL,
  BLOCKER,
  BLOCKER_FRAGE,
  BLOCKER_HINWEIS,
  BLOCKER_MATERIAL_FOLGEFRAGE,
  BLOCKER_ZEIT_FOLGEFRAGE,
  KERNFRAGE,
  KERNFRAGE_HINWEIS,
  ROLLEN,
  ROLLEN_FRAGE,
  ROTIERENDE_ANTWORTEN,
  STUFEN,
  TECHNIK_FRAGE,
  TECH_STUFEN,
  rotierendeFrage,
} from "@/lib/umfrage/fragen";
import ErgebnisAnzeige, { type ErgebnisView } from "./ErgebnisAnzeige";

export interface VorhandeneAntwort {
  rolle: string;
  stufe: number | null;
  techStufe: number | null;
  blocker: number;
  blockerStufe: number | null;
  blockerSuche: string | null;
  rotierend: string;
}

interface UmfrageFormularProps {
  token: string;
  /** nur beim Klassen-Link (QR): der gewählte Platz */
  teilnehmerId?: number;
  vorname: string;
  klasseName: string;
  rotierenderInhalt: string;
  /** Vorbelegung der Rollenfrage (zuletzt gemeldete Rolle am Platz) */
  vorbelegteRolle?: string | null;
  /** Prefill zur Korrektur, nur über den persönlichen Link */
  vorhandeneAntwort?: VorhandeneAntwort | null;
}

function OptionButton({
  selected,
  onClick,
  children,
  alarm = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  alarm?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
        selected
          ? alarm
            ? "border-red-500 bg-red-50 text-red-700 font-semibold"
            : "border-green bg-green/10 text-slate font-semibold"
          : "border-slate-200 bg-white text-slate hover:border-green/60"
      }`}
    >
      {children}
    </button>
  );
}

function Frage({ titel, hinweis, children }: { titel: string; hinweis?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate">{titel}</h2>
        {hinweis ? <p className="text-sm text-gray mt-1">{hinweis}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function UmfrageFormular({
  token,
  teilnehmerId,
  vorname,
  klasseName,
  rotierenderInhalt,
  vorbelegteRolle,
  vorhandeneAntwort,
}: UmfrageFormularProps) {
  const [rolle, setRolle] = useState<string | null>(
    vorhandeneAntwort?.rolle ?? vorbelegteRolle ?? null
  );
  const [stufe, setStufe] = useState<number | null>(vorhandeneAntwort?.stufe ?? null);
  const [techStufe, setTechStufe] = useState<number | null>(
    vorhandeneAntwort?.techStufe ?? null
  );
  const [blocker, setBlocker] = useState<number | null>(vorhandeneAntwort?.blocker ?? null);
  const [blockerStufe, setBlockerStufe] = useState<number | null>(
    vorhandeneAntwort?.blockerStufe ?? null
  );
  const [blockerSuche, setBlockerSuche] = useState(vorhandeneAntwort?.blockerSuche ?? "");
  const [rotierend, setRotierend] = useState<string | null>(
    vorhandeneAntwort?.rotierend ?? null
  );
  const [anonym, setAnonym] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot
  const [sende, setSende] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<ErgebnisView | null>(null);

  const istTechnik = rolle === "TECHNIK";

  const vollstaendig = useMemo(() => {
    if (!rolle) return false;
    if (istTechnik ? techStufe === null : stufe === null) return false;
    if (blocker === null) return false;
    if (blocker === 1 && blockerStufe === null) return false;
    if (blocker === 7 && blockerSuche.trim() === "") return false;
    if (!rotierend) return false;
    return true;
  }, [rolle, istTechnik, techStufe, stufe, blocker, blockerStufe, blockerSuche, rotierend]);

  async function absenden() {
    if (!vollstaendig || sende) return;
    setSende(true);
    setFehler(null);
    try {
      const res = await fetch("/api/umfrage/antwort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          teilnehmerId,
          rolle,
          stufe: istTechnik ? null : stufe,
          techStufe: istTechnik ? techStufe : null,
          blocker,
          blockerStufe: blocker === 1 ? blockerStufe : null,
          blockerSuche: blocker === 7 ? blockerSuche : null,
          rotierend,
          anonym,
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFehler(data.error ?? "Da ist etwas schiefgelaufen. Bitte versuche es noch einmal.");
        return;
      }
      setErgebnis(data.ergebnis as ErgebnisView);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFehler("Da ist etwas schiefgelaufen. Bitte versuche es noch einmal.");
    } finally {
      setSende(false);
    }
  }

  if (ergebnis) {
    return <ErgebnisAnzeige ergebnis={ergebnis} klasseName={klasseName} />;
  }

  return (
    <div className="space-y-10">
      {vorhandeneAntwort ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Du hast in dieser Runde schon geantwortet. Du kannst deine Antwort ändern, solange
          die Runde läuft.
        </div>
      ) : null}

      <p className="text-gray">
        Hallo {vorname}, vier kurze Fragen zu deinem Stand in der {klasseName}. Direkt nach dem
        Absenden siehst du, wo du im Vergleich zu deiner Klasse stehst.
      </p>

      <Frage titel={ROLLEN_FRAGE}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ROLLEN.map((r) => (
            <OptionButton
              key={r.wert}
              selected={rolle === r.wert}
              alarm={r.istAlarm}
              onClick={() => setRolle(r.wert)}
            >
              {r.label}
            </OptionButton>
          ))}
        </div>
      </Frage>

      {rolle ? (
        istTechnik ? (
          <Frage titel={TECHNIK_FRAGE} hinweis={KERNFRAGE_HINWEIS}>
            <div className="space-y-2">
              {TECH_STUFEN.map((s) => (
                <OptionButton
                  key={s.wert}
                  selected={techStufe === s.wert}
                  onClick={() => setTechStufe(s.wert)}
                >
                  <span className="inline-block w-6 font-mono text-gray">{s.wert}</span>
                  {s.label}
                </OptionButton>
              ))}
            </div>
          </Frage>
        ) : (
          <Frage titel={KERNFRAGE} hinweis={KERNFRAGE_HINWEIS}>
            <div className="space-y-2">
              {STUFEN.map((s) => (
                <OptionButton
                  key={s.wert}
                  selected={stufe === s.wert}
                  onClick={() => setStufe(s.wert)}
                >
                  <span className="inline-block w-6 font-mono text-gray">{s.wert}</span>
                  {s.label}
                </OptionButton>
              ))}
            </div>
          </Frage>
        )
      ) : null}

      <Frage titel={BLOCKER_FRAGE} hinweis={BLOCKER_HINWEIS}>
        <div className="space-y-2">
          {BLOCKER.map((b) => (
            <OptionButton
              key={b.wert}
              selected={blocker === b.wert}
              onClick={() => setBlocker(b.wert)}
            >
              {b.label}
            </OptionButton>
          ))}
        </div>
        {blocker === 1 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate">{BLOCKER_ZEIT_FOLGEFRAGE}</p>
            <div className="space-y-2">
              {STUFEN.filter((s) => s.wert >= 1).map((s) => (
                <OptionButton
                  key={s.wert}
                  selected={blockerStufe === s.wert}
                  onClick={() => setBlockerStufe(s.wert)}
                >
                  <span className="inline-block w-6 font-mono text-gray">{s.wert}</span>
                  {s.label}
                </OptionButton>
              ))}
            </div>
          </div>
        ) : null}
        {blocker === 7 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <label className="text-sm font-semibold text-slate" htmlFor="blockerSuche">
              {BLOCKER_MATERIAL_FOLGEFRAGE}
            </label>
            <input
              id="blockerSuche"
              type="text"
              maxLength={300}
              value={blockerSuche}
              onChange={(e) => setBlockerSuche(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green focus:outline-none"
            />
          </div>
        ) : null}
      </Frage>

      <Frage titel={rotierendeFrage(rotierenderInhalt)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ROTIERENDE_ANTWORTEN.map((a) => (
            <OptionButton
              key={a.wert}
              selected={rotierend === a.wert}
              onClick={() => setRotierend(a.wert)}
            >
              {a.label}
            </OptionButton>
          ))}
        </div>
      </Frage>

      <Frage titel={ANONYM_LABEL} hinweis={ANONYM_HINWEIS}>
        <textarea
          value={anonym}
          onChange={(e) => setAnonym(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-green focus:outline-none"
          placeholder="Optional. Dieses Feld wird ohne deinen Namen gespeichert."
        />
      </Frage>

      {/* Honeypot: für Menschen unsichtbar */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {fehler ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fehler}
        </div>
      ) : null}

      <button
        type="button"
        onClick={absenden}
        disabled={!vollstaendig || sende}
        className="w-full rounded-xl bg-green px-6 py-4 text-base font-bold text-slate disabled:opacity-40"
      >
        {sende ? "Wird gespeichert…" : "Absenden und Vergleich sehen"}
      </button>
    </div>
  );
}
