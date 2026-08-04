"use client";

import { useState, useTransition } from "react";
import { Mail, RotateCcw, Send, X } from "lucide-react";
import { sendFirmenErinnerungAction } from "@/app/admin/actions";
import type { FirmenStatistik } from "@/lib/db/anwesenheit";

// Erinnerungs-Mail an wenig engagierte Firmen (schwache Teilnahmequote oder
// geringer Videokurs-Fortschritt): Button in der KPI-Tabelle öffnet einen
// Dialog mit vorgeschriebener, frei anpassbarer E-Mail (inkl. Teilnahme- und
// Videokurs-Daten je Mitarbeiter). Versand an einen wählbaren
// Besteller-Kontakt der Firma.

function buildBetreff(klasseName: string): string {
  return `${klasseName}: Eure Teilnahme – wie kann ich helfen?`;
}

function videoText(video: number | null): string {
  if (video === null) return "noch nicht im Videokurs eingeloggt";
  return `${video} % der Videos gesehen`;
}

function buildVorlage(
  firma: FirmenStatistik,
  kontaktName: string,
  klasseName: string,
  berichte: number
): string {
  const vorname = kontaktName.trim().split(/\s+/)[0] || "";
  const anrede = vorname ? `Hallo ${vorname},` : "Hallo,";
  const teilnahmeZeilen = firma.mitarbeiter
    .map(
      (m) =>
        `- ${m.name}: ${m.anwesend} von ${berichte} ${berichte === 1 ? "Termin" : "Terminen"} · Videokurs: ${videoText(m.video)}`
    )
    .join("\n");

  const teilnahmeInfo = `${firma.anwesend} von ${firma.moeglich} möglichen Teilnahmen (${firma.quote} %)`;
  // Einstieg je nach Schwachstelle: geringe Termin-Teilnahme (ggf. plus
  // Videokurs) oder – bei ordentlicher Teilnahme – nur der Videokurs.
  const einstieg =
    firma.quote < 50
      ? `mir ist aufgefallen, dass die Teilnahme von ${firma.firma} an den bisherigen Terminen der ${klasseName} leider gering war: ${teilnahmeInfo}.${
          firma.videoQuote === null
            ? " Auch im begleitenden Videokurs ist bisher niemand von euch aktiv geworden."
            : ` Auch im begleitenden Videokurs ist noch Luft nach oben: im Schnitt sind erst ${firma.videoQuote} % der Videos gesehen.`
        }`
      : `mir ist aufgefallen, dass ${firma.firma} den begleitenden Videokurs der ${klasseName} bisher kaum nutzt: im Schnitt sind erst ${firma.videoQuote ?? 0} % der Videos gesehen. Bei den Live-Terminen seid ihr mit ${teilnahmeInfo} dabei – umso mehr lohnt es sich, auch die Videoinhalte mitzunehmen.`;

  return `${anrede}

${einstieg}

So sieht es bei euren angemeldeten Mitarbeitern im Einzelnen aus:
${teilnahmeZeilen}

Die Masterclass lebt vom regelmäßigen Dranbleiben – und ihr verpasst gerade Inhalte, die ihr bereits gebucht habt.

Deshalb meine Frage: Was kann ich tun, um euch die Teilnahme zu erleichtern? Passen die Termine zeitlich nicht, fehlen die Einladungen im Kalender oder gibt es andere Hürden? Gib mir gern kurz Bescheid – wir finden sicher eine Lösung.

Viele Grüße
Alexander Eggers`;
}

export function FirmenErinnerungButton({
  klasseId,
  klasseName,
  berichte,
  firma,
}: {
  klasseId: string;
  klasseName: string;
  berichte: number;
  firma: FirmenStatistik;
}) {
  const [open, setOpen] = useState(false);
  const [empfaenger, setEmpfaenger] = useState(firma.besteller[0]?.email ?? "");
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isSending, startSend] = useTransition();

  const hatBesteller = firma.besteller.length > 0;

  function vorlageFuer(email: string): string {
    const kontakt = firma.besteller.find((b) => b.email === email);
    return buildVorlage(firma, kontakt?.name ?? "", klasseName, berichte);
  }

  function handleOpen() {
    const initial = firma.besteller[0]?.email ?? "";
    setEmpfaenger(initial);
    setBetreff(buildBetreff(klasseName));
    setText(vorlageFuer(initial));
    setDirty(false);
    setMsg(null);
    setOpen(true);
  }

  function handleEmpfaengerChange(email: string) {
    setEmpfaenger(email);
    // Anrede nur neu erzeugen, solange der Text nicht manuell angepasst wurde.
    if (!dirty) setText(vorlageFuer(email));
  }

  function handleReset() {
    setText(vorlageFuer(empfaenger));
    setBetreff(buildBetreff(klasseName));
    setDirty(false);
  }

  function handleSend() {
    setMsg(null);
    startSend(async () => {
      const res = await sendFirmenErinnerungAction(
        klasseId,
        empfaenger,
        betreff,
        text
      );
      setMsg(
        res.error
          ? { kind: "err", text: res.error }
          : { kind: "ok", text: `E-Mail an ${empfaenger} gesendet.` }
      );
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={!hatBesteller}
        title={
          hatBesteller
            ? "Erinnerungs-Mail an den Besteller der Firma schreiben"
            : "Kein Besteller-Kontakt mit E-Mail für diese Firma hinterlegt."
        }
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Mail className="w-3.5 h-3.5" />
        Erinnerung
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-dark-slate-900">
                  Teilnahme-Erinnerung an {firma.firma}
                </h3>
                <p className="text-sm text-dark-slate-500">
                  Quote bisher: {firma.anwesend}/{firma.moeglich} Teilnahmen (
                  {firma.quote} %) über {firma.teilnehmer} Mitarbeiter · Videokurs
                  Ø:{" "}
                  {firma.videoQuote === null
                    ? "keine Daten"
                    : `${firma.videoQuote} %`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-dark-slate-400 hover:text-dark-slate-700 rounded"
                title="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                  Empfänger (Besteller der Firma)
                </label>
                <select
                  value={empfaenger}
                  onChange={(e) => handleEmpfaengerChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
                >
                  {firma.besteller.map((b) => (
                    <option key={b.email} value={b.email}>
                      {b.name} · {b.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                  Betreff
                </label>
                <input
                  value={betreff}
                  onChange={(e) => setBetreff(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                  E-Mail-Text (anpassbar, Versand als einfache Text-Mail)
                </label>
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setDirty(true);
                  }}
                  rows={16}
                  className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none resize-y"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !empfaenger}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? "Wird gesendet…" : "Senden"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-dark-slate-500 hover:text-dark-slate-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  Text zurücksetzen
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-dark-slate-500 hover:text-dark-slate-700"
                >
                  Schließen
                </button>
              </div>
              {msg && (
                <p
                  className={`text-sm ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}
                >
                  {msg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
