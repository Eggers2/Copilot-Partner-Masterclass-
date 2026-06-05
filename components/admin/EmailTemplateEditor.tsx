"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Save, Send, Power } from "lucide-react";
import { renderTemplate } from "@/lib/email/renderTemplate";
import {
  saveTemplateAction,
  sendTestEmailAction,
  toggleAktivAction,
} from "@/app/admin/emails/actions";

interface Props {
  templateKey: string;
  initialName: string;
  initialBetreff: string;
  initialHtml: string;
  beschreibung: string | null;
  aktiv: boolean;
  sampleVars: Record<string, string>;
  resendConfigured: boolean;
}

export function EmailTemplateEditor({
  templateKey,
  initialName,
  initialBetreff,
  initialHtml,
  beschreibung,
  aktiv: initialAktiv,
  sampleVars,
  resendConfigured,
}: Props) {
  const [name, setName] = useState(initialName);
  const [betreff, setBetreff] = useState(initialBetreff);
  const [html, setHtml] = useState(initialHtml);
  const [aktiv, setAktiv] = useState(initialAktiv);
  const [testEmail, setTestEmail] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [isTesting, startTest] = useTransition();

  const dirty =
    name !== initialName || betreff !== initialBetreff || html !== initialHtml;

  const previewHtml = useMemo(() => renderTemplate(html, sampleVars), [html, sampleVars]);
  const previewBetreff = useMemo(
    () => renderTemplate(betreff, sampleVars),
    [betreff, sampleVars]
  );

  const variableKeys = Object.keys(sampleVars);

  function handleSave() {
    setMsg(null);
    startSave(async () => {
      const res = await saveTemplateAction(templateKey, { name, betreff, html });
      if (res.ok) setMsg({ kind: "ok", text: "Gespeichert." });
      else setMsg({ kind: "err", text: "Speichern fehlgeschlagen." });
    });
  }

  function handleToggle() {
    setMsg(null);
    const next = !aktiv;
    startToggle(async () => {
      const res = await toggleAktivAction(templateKey, next);
      if (res.ok) {
        setAktiv(next);
        setMsg({
          kind: "ok",
          text: next
            ? "Aktiv – Versand läuft jetzt über Resend."
            : "Deaktiviert – Versand läuft über n8n (Fallback).",
        });
      } else {
        setMsg({ kind: "err", text: res.error ?? "Umschalten fehlgeschlagen." });
      }
    });
  }

  function handleTest() {
    setMsg(null);
    startTest(async () => {
      const res = await sendTestEmailAction(templateKey, testEmail);
      if (res.ok) setMsg({ kind: "ok", text: `Test-Mail an ${testEmail} gesendet.` });
      else setMsg({ kind: "err", text: res.error ?? "Test-Versand fehlgeschlagen." });
    });
  }

  return (
    <div>
      <Link
        href="/admin/emails"
        className="inline-flex items-center gap-2 text-sm text-dark-slate-500 hover:text-dark-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück zur Übersicht
      </Link>

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate-900">{name}</h1>
          <p className="text-dark-slate-500 text-sm mt-1">
            Key: <code className="text-xs">{templateKey}</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              aktiv
                ? "bg-green-100 text-green-700"
                : "bg-dark-slate-100 text-dark-slate-500"
            }`}
          >
            {aktiv ? "Resend aktiv" : "n8n (Fallback)"}
          </span>
          <button
            onClick={handleToggle}
            disabled={isToggling || (!aktiv && !resendConfigured)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-dark-slate-200 text-dark-slate-700 hover:bg-dark-slate-50 disabled:opacity-50 transition-colors"
            title={!resendConfigured ? "Resend ist nicht konfiguriert" : ""}
          >
            <Power className="w-4 h-4" />
            {aktiv ? "Auf n8n zurückschalten" : "Über Resend aktivieren"}
          </button>
        </div>
      </div>

      {!resendConfigured && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Resend ist nicht konfiguriert (RESEND_API_KEY / RESEND_FROM_EMAIL). Bearbeiten und
          Speichern funktioniert, der Versand läuft bis zur Konfiguration über n8n.
        </div>
      )}

      {msg && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
            msg.kind === "ok"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-slate-700 mb-1">
              Anzeigename
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-dark-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#030386]/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-slate-700 mb-1">
              Betreff
            </label>
            <input
              type="text"
              value={betreff}
              onChange={(e) => setBetreff(e.target.value)}
              className="w-full px-3 py-2 border border-dark-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#030386]/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-slate-700 mb-1">
              HTML-Inhalt
            </label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
              rows={20}
              className="w-full px-3 py-2 border border-dark-slate-200 rounded-lg text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#030386]/30"
            />
            <p className="text-xs text-dark-slate-400 mt-1">
              HTML aus dem Claude-Chat hier einfügen. Platzhalter wie{" "}
              <code>{"{{code}}"}</code> werden beim Versand ersetzt.
            </p>
          </div>

          {variableKeys.length > 0 && (
            <div className="bg-dark-slate-50 border border-dark-slate-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-dark-slate-600 mb-2">
                Verfügbare Variablen
              </p>
              {beschreibung && (
                <p className="text-xs text-dark-slate-500 mb-2">{beschreibung}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {variableKeys.map((k) => (
                  <code
                    key={k}
                    className="text-xs px-2 py-1 bg-white border border-dark-slate-200 rounded text-[#030386]"
                  >
                    {`{{${k}}}`}
                  </code>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving || !dirty}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#030386] hover:bg-[#040499] text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Speichern…" : "Speichern"}
            </button>
            {dirty && (
              <span className="text-xs text-amber-600">Ungespeicherte Änderungen</span>
            )}
          </div>

          {/* Test-Mail */}
          <div className="border-t border-dark-slate-100 pt-4">
            <label className="block text-sm font-medium text-dark-slate-700 mb-1">
              Test-Mail senden (über Resend)
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="deine@adresse.de"
                className="flex-1 px-3 py-2 border border-dark-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#030386]/30"
              />
              <button
                onClick={handleTest}
                disabled={isTesting || !testEmail || !resendConfigured}
                className="inline-flex items-center gap-2 px-4 py-2 border border-dark-slate-200 text-dark-slate-700 hover:bg-dark-slate-50 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
                {isTesting ? "Senden…" : "Test"}
              </button>
            </div>
            <p className="text-xs text-dark-slate-400 mt-1">
              Verwendet Beispielwerte für die Platzhalter.
            </p>
          </div>
        </div>

        {/* Vorschau */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-dark-slate-700 mb-2">
            <Eye className="w-4 h-4" />
            Live-Vorschau
          </div>
          <div className="border border-dark-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="px-3 py-2 border-b border-dark-slate-100 bg-dark-slate-50">
              <p className="text-xs text-dark-slate-400">Betreff</p>
              <p className="text-sm font-medium text-dark-slate-800">{previewBetreff}</p>
            </div>
            <iframe
              title="E-Mail-Vorschau"
              srcDoc={previewHtml}
              className="w-full h-[640px] bg-white"
              sandbox=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}
