"use client";

import { useEffect, useRef, useState, useActionState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  CheckCircle2,
  Circle,
  Upload,
  FileText,
  Send,
  Video,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  CalendarPlus,
  Users,
  AlertTriangle,
} from "lucide-react";
import type { TerminStatus } from "@prisma/client";
import {
  createTerminAction,
  updateTerminAction,
  setTerminStatusAction,
  deleteTerminAction,
  analyzeTerminTranscriptAction,
  sendTerminProtokollAction,
  sendTerminProtokollTestAction,
  generateNextTermineAction,
  uploadTerminAnwesenheitAction,
  deleteTerminAnwesenheitAction,
} from "@/app/admin/actions";
import { decodeAnwesenheitsdatei, formatDauer } from "@/lib/termine/anwesenheit";

export interface AnwesenheitZeileView {
  name: string;
  email: string;
  rolle: string | null;
  dauerSekunden: number;
  status: "registriert" | "unbekannt" | "ignoriert";
}

export interface TerminAnwesenheitInfo {
  dateiname: string;
  importiertAm: string; // ISO
  gesamt: number;
  registriert: number;
  ignoriert: number;
  unbekannt: number;
  zeilen: AnwesenheitZeileView[];
}

export interface TerminView {
  id: string;
  datum: string; // ISO
  thema: string | null;
  notizen: string | null;
  status: TerminStatus;
  ferien: boolean;
  videoUrl: string | null;
  teamsLink: string | null;
  zusammenfassung: string | null;
  protokoll: string | null;
  transkriptDateiname: string | null;
  protokollGesendetAm: string | null; // ISO
  anwesenheit: TerminAnwesenheitInfo | null;
}

const DEFAULT_TEST_EMAIL = "ae@nextvideo.de";

const inputClass =
  "w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none";
const labelClass = "block text-sm font-medium text-dark-slate-600 mb-1";

/** ISO-Datum → "YYYY-MM-DDTHH:mm" in Europe/Berlin (für datetime-local). */
function toInputDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function formatDatum(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TerminForm({
  klasseId,
  initial,
  onDone,
}: {
  klasseId: string;
  initial?: TerminView;
  onDone: () => void;
}) {
  const mode = initial ? "edit" : "create";
  const action = mode === "create" ? createTerminAction : updateTerminAction;
  const [state, formAction, isPending] = useActionState(action, null);

  // Bei Erfolg schließt sich das Formular; revalidatePath in der Action hat die
  // Liste der Termine bereits serverseitig aktualisiert.
  useEffect(() => {
    if (state?.success) onDone();
  }, [state?.success, onDone]);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-dark-slate-200 bg-dark-slate-50/50 p-4 space-y-3"
    >
      <input type="hidden" name="klasseId" value={klasseId} />
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Datum & Uhrzeit *</label>
          <input
            name="datum"
            type="datetime-local"
            required
            defaultValue={initial ? toInputDateTime(initial.datum) : ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            name="status"
            defaultValue={initial?.status ?? "GEPLANT"}
            className={inputClass}
          >
            <option value="GEPLANT">Geplant</option>
            <option value="DURCHGEFUEHRT">Durchgeführt</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Thema</label>
        <input
          name="thema"
          defaultValue={initial?.thema ?? ""}
          placeholder="z.B. Copilot in Excel – Formeln & Datenanalyse"
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-dark-slate-600">
        <input
          name="ferien"
          type="checkbox"
          defaultChecked={initial?.ferien ?? false}
          className="rounded border-dark-slate-300"
        />
        Ferienfenster (keine Umfrage-Erinnerung, mildert die Anwesenheits-Deutung)
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Video-Link (SharePoint)</label>
          <input
            name="videoUrl"
            type="url"
            defaultValue={initial?.videoUrl ?? ""}
            placeholder="https://…sharepoint.com/…"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Teams-Link</label>
          <input
            name="teamsLink"
            type="url"
            defaultValue={initial?.teamsLink ?? ""}
            placeholder="https://teams.microsoft.com/l/meetup-join/…"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notizen</label>
        <textarea
          name="notizen"
          rows={2}
          defaultValue={initial?.notizen ?? ""}
          placeholder="Optionale Notiz zum Termin…"
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Zusammenfassung & Protokoll nur im Bearbeiten-Modus (von der KI befüllt,
          hier manuell anpassbar vor dem Versand). */}
      {mode === "edit" && (
        <>
          <div>
            <label className={labelClass}>
              Zusammenfassung (kompakt – steht im E-Mail-Text)
            </label>
            <textarea
              name="zusammenfassung"
              rows={4}
              defaultValue={initial?.zusammenfassung ?? ""}
              placeholder="Wird beim Transkript-Upload automatisch erzeugt – hier anpassbar."
              className={`${inputClass} resize-y`}
            />
          </div>
          <div>
            <label className={labelClass}>
              Protokoll (ausführlich – geht als PDF-Anhang mit)
            </label>
            <textarea
              name="protokoll"
              rows={8}
              defaultValue={initial?.protokoll ?? ""}
              placeholder="Wird beim Transkript-Upload automatisch erzeugt – hier anpassbar."
              className={`${inputClass} resize-y`}
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {mode === "create" ? "Termin anlegen" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-2 text-sm font-medium text-dark-slate-500 hover:text-dark-slate-700"
        >
          Abbrechen
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && (
          <p className="text-sm text-green-600">Gespeichert! Liste wird aktualisiert…</p>
        )}
      </div>
    </form>
  );
}

/**
 * Anwesenheitsbericht (MS Teams) je Termin: Upload des CSV-Exports, Kennzahlen
 * und deutlicher Hinweis auf Anwesende, die nicht in der Teilnehmerübersicht
 * der Klasse stehen (weitergegebener Meeting-Link).
 */
function TerminAnwesenheitSection({ termin }: { termin: TerminView }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);

  const a = termin.anwesenheit;
  const unbekannte = a ? a.zeilen.filter((z) => z.status === "unbekannt") : [];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      // Teams exportiert UTF-16 – daher nicht file.text() (UTF-8), sondern
      // Byte-genau lesen und die Kodierung selbst erkennen.
      const buffer = await file.arrayBuffer();
      const text = decodeAnwesenheitsdatei(buffer);
      const res = await uploadTerminAnwesenheitAction(termin.id, text, file.name);
      if (res.error) {
        setMsg({ kind: "err", text: res.error });
      } else {
        setMsg({
          kind: "ok",
          text: `${res.gesamt} Anwesende importiert${
            res.unbekannt
              ? ` · ${res.unbekannt} nicht in der Teilnehmerübersicht!`
              : ""
          }`,
        });
      }
    } catch {
      setMsg({ kind: "err", text: "Datei konnte nicht gelesen werden." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleDelete() {
    if (!confirm("Anwesenheitsbericht dieses Termins wirklich entfernen?")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await deleteTerminAnwesenheitAction(termin.id);
      if (res.error) setMsg({ kind: "err", text: res.error });
    });
  }

  const visible = a ? (showAll ? a.zeilen : a.zeilen.slice(0, 10)) : [];

  return (
    <div className="border-t border-dark-slate-200 pt-3 space-y-2">
      <h4 className="text-sm font-semibold text-dark-slate-700 flex items-center gap-1.5">
        <Users className="w-4 h-4" />
        Anwesenheit (Teams-Bericht)
      </h4>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading
            ? "Wird importiert…"
            : a
              ? "Bericht ersetzen"
              : "Anwesenheitsbericht hochladen"}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
        {a && (
          <>
            <span className="text-xs text-dark-slate-500">
              {a.dateiname} · importiert am {formatDatum(a.importiertAm)}
            </span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="p-1.5 text-dark-slate-400 hover:text-red-600 rounded disabled:opacity-50"
              title="Anwesenheitsbericht entfernen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      {!a && (
        <p className="text-xs text-dark-slate-400">
          CSV-Export aus Teams (Anwesenheit → Herunterladen). Gleicht die
          Anwesenden mit der Teilnehmerübersicht der Klasse ab.
        </p>
      )}
      {msg && (
        <p className={`text-sm ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}

      {a && (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center px-2 py-1 rounded-full font-semibold bg-blue-50 text-[#030386]">
              {a.gesamt} anwesend
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full font-semibold bg-green-100 text-green-700">
              {a.registriert} registriert
            </span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full font-semibold ${
                unbekannte.length > 0
                  ? "bg-red-100 text-red-700"
                  : "bg-dark-slate-100 text-dark-slate-600"
              }`}
            >
              {unbekannte.length} nicht registriert
            </span>
            {a.ignoriert > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full font-semibold bg-dark-slate-100 text-dark-slate-600">
                {a.ignoriert} ignoriert (Moderation)
              </span>
            )}
          </div>

          {unbekannte.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {unbekannte.length}{" "}
                {unbekannte.length === 1 ? "Anwesender steht" : "Anwesende stehen"}{" "}
                nicht in der Teilnehmerübersicht:
              </p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-red-700">
                {unbekannte.map((z, i) => (
                  <li key={i}>
                    {z.name}
                    {" – "}
                    <span className="font-mono text-xs">
                      {z.email || "keine E-Mail im Bericht"}
                    </span>
                    {z.rolle && ` (${z.rolle})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dark-slate-400">
                  <th className="py-1 pr-3 font-medium">Name</th>
                  <th className="py-1 pr-3 font-medium">E-Mail</th>
                  <th className="py-1 pr-3 font-medium">Dauer</th>
                  <th className="py-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-slate-50">
                {visible.map((z, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-3 text-dark-slate-800">{z.name}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-dark-slate-500">
                      {z.email || "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-dark-slate-600 whitespace-nowrap">
                      {formatDauer(z.dauerSekunden)}
                    </td>
                    <td className="py-1.5">
                      {z.status === "registriert" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          registriert
                        </span>
                      ) : z.status === "ignoriert" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-dark-slate-100 text-dark-slate-600">
                          ignoriert
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          nicht registriert
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {a.zeilen.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-1 text-xs text-[#030386] hover:underline"
              >
                {showAll
                  ? "Weniger anzeigen"
                  : `Alle ${a.zeilen.length} Anwesenden anzeigen`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Transkript-Upload, KI-Auswertung, Links und Protokoll-Versand je Termin. */
function TerminDetailPanel({ termin }: { termin: TerminView }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [testEmail, setTestEmail] = useState(DEFAULT_TEST_EMAIL);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isSending, startSend] = useTransition();

  const hasProtokoll = !!termin.protokoll?.trim();
  const gesendetAm = termin.protokollGesendetAm
    ? formatDatum(termin.protokollGesendetAm)
    : null;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setAnalyzeError("");
    setMsg(null);
    try {
      const text = await file.text();
      const res = await analyzeTerminTranscriptAction(termin.id, text, file.name);
      if (res.error) setAnalyzeError(res.error);
    } catch {
      setAnalyzeError("Datei konnte nicht gelesen werden.");
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleTest() {
    setMsg(null);
    startSend(async () => {
      const res = await sendTerminProtokollTestAction(termin.id, testEmail);
      setMsg(
        res.error
          ? { kind: "err", text: res.error }
          : { kind: "ok", text: `Testprotokoll an ${testEmail} gesendet.` }
      );
    });
  }

  function handleSend() {
    const warn = gesendetAm
      ? `Das Protokoll wurde bereits am ${gesendetAm} gesendet. Erneut an alle Teilnehmer senden?`
      : "Protokoll jetzt an alle Teilnehmer der Klasse senden?";
    if (!confirm(warn)) return;
    setMsg(null);
    startSend(async () => {
      const res = await sendTerminProtokollAction(termin.id);
      setMsg(
        res.error
          ? { kind: "err", text: res.error }
          : {
              kind: "ok",
              text: `An ${res.sent} Teilnehmer gesendet${
                res.failed ? ` · ${res.failed} fehlgeschlagen` : ""
              }.`,
            }
      );
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-dark-slate-200 bg-dark-slate-50/40 p-4 space-y-4">
      {/* Links */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {termin.videoUrl ? (
          <a
            href={termin.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#030386] hover:underline"
          >
            <Video className="w-4 h-4" />
            Aufzeichnung ansehen
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-dark-slate-400">
            <Video className="w-4 h-4" />
            Kein Video-Link
          </span>
        )}
        {termin.teamsLink ? (
          <a
            href={termin.teamsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#030386] hover:underline"
          >
            <LinkIcon className="w-4 h-4" />
            Teams-Meeting
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-dark-slate-400">
            <LinkIcon className="w-4 h-4" />
            Kein Teams-Link
          </span>
        )}
      </div>

      {/* Transkript-Upload */}
      <div>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          {analyzing
            ? "Wird ausgewertet…"
            : termin.transkriptDateiname
              ? "Transkript ersetzen & neu auswerten"
              : "Transkript hochladen & auswerten"}
          <input
            ref={fileRef}
            type="file"
            accept=".vtt,.txt,text/vtt,text/plain"
            className="hidden"
            onChange={handleFileSelect}
            disabled={analyzing}
          />
        </label>
        {termin.transkriptDateiname && (
          <span className="ml-2 text-xs text-dark-slate-500">
            zuletzt: {termin.transkriptDateiname}
          </span>
        )}
        {analyzeError && <p className="text-sm text-red-600 mt-1">{analyzeError}</p>}
        <p className="text-xs text-dark-slate-400 mt-1">
          VTT- oder Text-Datei. Erzeugt automatisch Zusammenfassung + Protokoll (und Thema, falls leer).
        </p>
      </div>

      {/* Zusammenfassung */}
      {termin.zusammenfassung && (
        <div>
          <h4 className="text-sm font-semibold text-dark-slate-700 mb-1 flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            Zusammenfassung
          </h4>
          <p className="text-sm text-dark-slate-600 whitespace-pre-line">
            {termin.zusammenfassung}
          </p>
        </div>
      )}

      {/* Anwesenheitsbericht */}
      <TerminAnwesenheitSection termin={termin} />

      {/* Protokoll-Versand */}
      <div className="border-t border-dark-slate-200 pt-3 space-y-2">
        <h4 className="text-sm font-semibold text-dark-slate-700">
          Protokoll an Teilnehmer
        </h4>
        {!hasProtokoll ? (
          <p className="text-xs text-dark-slate-400">
            Noch kein Protokoll – zuerst ein Transkript hochladen und auswerten.
          </p>
        ) : (
          <p className="text-xs text-dark-slate-400">
            Die E-Mail (Branddesign) enthält die kompakte Zusammenfassung, den
            Video-Link und den Folgetermin mit Teams-Link; das ausführliche
            Protokoll geht als PDF-Anhang mit. Beide Texte sind vor dem Versand
            über „Bearbeiten“ (Stift) anpassbar.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className={`${inputClass} max-w-xs`}
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={!hasProtokoll || isSending}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Testprotokoll an mich senden
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!hasProtokoll || isSending}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            An Teilnehmer senden
          </button>
        </div>
        {gesendetAm && (
          <p className="text-xs text-dark-slate-500">Gesendet am {gesendetAm}</p>
        )}
        {msg && (
          <p className={`text-sm ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}

function TerminRow({
  klasseId,
  termin,
}: {
  klasseId: string;
  termin: TerminView;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const done = termin.status === "DURCHGEFUEHRT";

  if (isEditing) {
    return (
      <li className="py-3">
        <TerminForm
          klasseId={klasseId}
          initial={termin}
          onDone={() => setIsEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-dark-slate-900">
              {formatDatum(termin.datum)}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                done
                  ? "bg-green-100 text-green-700"
                  : "bg-dark-slate-100 text-dark-slate-600"
              }`}
            >
              {done ? "Durchgeführt" : "Geplant"}
            </span>
            {termin.ferien && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                Ferienfenster
              </span>
            )}
            {termin.protokollGesendetAm && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#030386]">
                Protokoll gesendet
              </span>
            )}
            {termin.anwesenheit && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  termin.anwesenheit.unbekannt > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-50 text-[#030386]"
                }`}
                title={
                  termin.anwesenheit.unbekannt > 0
                    ? `${termin.anwesenheit.unbekannt} Anwesende nicht in der Teilnehmerübersicht`
                    : "Alle Anwesenden sind zugeordnet"
                }
              >
                <Users className="w-3 h-3" />
                {termin.anwesenheit.gesamt} anwesend
                {termin.anwesenheit.unbekannt > 0 && (
                  <AlertTriangle className="w-3 h-3" />
                )}
              </span>
            )}
          </div>
          <p className="text-sm text-dark-slate-700 mt-0.5">
            {termin.thema || (
              <span className="italic text-dark-slate-400">Kein Thema hinterlegt</span>
            )}
          </p>
          {termin.notizen && (
            <p className="text-xs text-dark-slate-500 mt-0.5 whitespace-pre-line">
              {termin.notizen}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            title={done ? "Als geplant markieren" : "Als durchgeführt markieren"}
            disabled={isPending}
            onClick={() =>
              startTransition(() =>
                setTerminStatusAction(
                  termin.id,
                  klasseId,
                  done ? "GEPLANT" : "DURCHGEFUEHRT"
                )
              )
            }
            className="p-1.5 text-dark-slate-400 hover:text-green-600 rounded disabled:opacity-50"
          >
            {done ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
          <button
            title={expanded ? "Details ausblenden" : "Transkript, Links & Protokoll"}
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 text-dark-slate-400 hover:text-[#030386] rounded"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            title="Bearbeiten"
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-dark-slate-400 hover:text-[#030386] rounded"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            title="Löschen"
            disabled={isPending}
            onClick={() => {
              if (!confirm("Diesen Termin wirklich löschen?")) return;
              startTransition(() => deleteTerminAction(termin.id, klasseId));
            }}
            className="p-1.5 text-dark-slate-400 hover:text-red-600 rounded disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && <TerminDetailPanel termin={termin} />}
    </li>
  );
}

function GenerateTermineButton({
  klasseId,
  hasRegel,
}: {
  klasseId: string;
  hasRegel: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function handleClick() {
    setMsg(null);
    startTransition(async () => {
      const res = await generateNextTermineAction(klasseId);
      if (res.error) {
        setMsg({ kind: "err", text: res.error });
      } else if (res.created === 0) {
        setMsg({ kind: "ok", text: "Alle anstehenden Termine sind bereits angelegt." });
      } else {
        setMsg({ kind: "ok", text: `${res.created} Termin(e) angelegt.` });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={!hasRegel || isPending}
        title={
          hasRegel
            ? undefined
            : "Keine Termin-Regel hinterlegt – bitte zuerst in den Stammdaten anlegen."
        }
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
      >
        <CalendarPlus className="w-4 h-4" />
        {isPending ? "Wird angelegt…" : "Nächste 2 Termine anlegen"}
      </button>
      {!hasRegel && (
        <span className="text-xs text-dark-slate-500">
          Keine Termin-Regel hinterlegt (in den Stammdaten oben).
        </span>
      )}
      {msg && (
        <span className={`text-sm ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </span>
      )}
    </div>
  );
}

export function KlasseTermine({
  klasseId,
  hasRegel,
  termine,
}: {
  klasseId: string;
  hasRegel: boolean;
  termine: TerminView[];
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-4">
      <GenerateTermineButton klasseId={klasseId} hasRegel={hasRegel} />

      {termine.length === 0 ? (
        <p className="text-sm text-dark-slate-400">
          Noch keine Termine angelegt. Lege den ersten Termin mit Datum und Thema an.
        </p>
      ) : (
        <ul className="divide-y divide-dark-slate-50">
          {termine.map((t) => (
            <TerminRow key={t.id} klasseId={klasseId} termin={t} />
          ))}
        </ul>
      )}

      {isAdding ? (
        <TerminForm klasseId={klasseId} onDone={() => setIsAdding(false)} />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Termin hinzufügen
        </button>
      )}
    </div>
  );
}
