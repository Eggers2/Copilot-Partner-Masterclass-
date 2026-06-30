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
} from "@/app/admin/actions";

export interface TerminView {
  id: string;
  datum: string; // ISO
  thema: string | null;
  notizen: string | null;
  status: TerminStatus;
  videoUrl: string | null;
  teamsLink: string | null;
  zusammenfassung: string | null;
  protokoll: string | null;
  transkriptDateiname: string | null;
  protokollGesendetAm: string | null; // ISO
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
            <label className={labelClass}>Zusammenfassung (kompakt)</label>
            <textarea
              name="zusammenfassung"
              rows={4}
              defaultValue={initial?.zusammenfassung ?? ""}
              placeholder="Wird beim Transkript-Upload automatisch erzeugt – hier anpassbar."
              className={`${inputClass} resize-y`}
            />
          </div>
          <div>
            <label className={labelClass}>Protokoll (Versand an Teilnehmer)</label>
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

      {/* Protokoll-Versand */}
      <div className="border-t border-dark-slate-200 pt-3 space-y-2">
        <h4 className="text-sm font-semibold text-dark-slate-700">
          Protokoll an Teilnehmer
        </h4>
        {!hasProtokoll && (
          <p className="text-xs text-dark-slate-400">
            Noch kein Protokoll – zuerst ein Transkript hochladen und auswerten.
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
            {termin.protokollGesendetAm && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#030386]">
                Protokoll gesendet
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

export function KlasseTermine({
  klasseId,
  termine,
}: {
  klasseId: string;
  termine: TerminView[];
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-4">
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
