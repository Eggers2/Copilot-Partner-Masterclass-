"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  RefreshCw,
  Plus,
  Save,
  Eye,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type {
  NewsletterContent,
  NewsletterNewsItem,
} from "@/lib/newsletter/types";
import type { NewsletterStatus } from "@prisma/client";
import { NewsletterStatusBadge } from "./NewsletterStatusBadge";
import {
  fetchMoreNewsAction,
  regeneratePromptAction,
  regenerateZahlAction,
  saveContentAction,
  sendNewsletterAction,
  sendTestMailAction,
} from "@/app/admin/newsletter/actions";

interface NewsletterEditorProps {
  id: string;
  ausgabeNr: number;
  kw: number;
  jahr: number;
  status: NewsletterStatus;
  titel: string;
  subtitle: string;
  zusatzMails: string;
  content: NewsletterContent;
  dbRecipientCount: number;
  fehlerText: string | null;
  previewHtml: string;
}

const MAX_SELECTED = 5;

export function NewsletterEditor(props: NewsletterEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState<NewsletterContent>(props.content);
  const [titel, setTitel] = useState(props.titel);
  const [subtitle, setSubtitle] = useState(props.subtitle);
  const [zusatzMails, setZusatzMails] = useState(props.zusatzMails);
  const [testEmail, setTestEmail] = useState("");
  const [toast, setToast] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);
  const [previewHtml, setPreviewHtml] = useState(props.previewHtml);

  const selectedCount = content.selectedIds.length;
  const readOnly =
    props.status === "SENT" || props.status === "SENDING";

  const manualMailCount = useMemo(() => {
    return zusatzMails
      .split(/[;\n,]+/)
      .map((s) => s.trim())
      .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)).length;
  }, [zusatzMails]);

  function flash(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 5000);
  }

  function toggleSelect(newsId: string) {
    setContent((c) => {
      const isSelected = c.selectedIds.includes(newsId);
      if (isSelected) {
        return { ...c, selectedIds: c.selectedIds.filter((id) => id !== newsId) };
      }
      if (c.selectedIds.length >= MAX_SELECTED) {
        flash("err", `Maximal ${MAX_SELECTED} News auswählbar.`);
        return c;
      }
      return { ...c, selectedIds: [...c.selectedIds, newsId] };
    });
  }

  function updateNewsField(
    newsId: string,
    field: keyof NewsletterNewsItem,
    value: string
  ) {
    setContent((c) => ({
      ...c,
      candidates: c.candidates.map((n) =>
        n.id === newsId ? { ...n, [field]: value } : n
      ),
    }));
  }

  function save() {
    startTransition(async () => {
      await saveContentAction(props.id, {
        content,
        titel,
        subtitle,
        zusatzMails,
      });
      flash("ok", "Gespeichert.");
      router.refresh();
    });
  }

  async function updatePreview() {
    const res = await fetch(`/api/admin/newsletter/${props.id}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, titel, subtitle }),
    });
    if (!res.ok) {
      flash("err", "Vorschau konnte nicht gerendert werden.");
      return;
    }
    const data = await res.json();
    setPreviewHtml(data.html);
  }

  function fetchMore() {
    startTransition(async () => {
      // Unsaved edits first
      await saveContentAction(props.id, {
        content,
        titel,
        subtitle,
        zusatzMails,
      });
      await fetchMoreNewsAction(props.id);
      flash("ok", "5 weitere News geladen.");
      router.refresh();
    });
  }

  function regeneratePrompt() {
    startTransition(async () => {
      await saveContentAction(props.id, {
        content,
        titel,
        subtitle,
        zusatzMails,
      });
      await regeneratePromptAction(props.id);
      flash("ok", "Prompt der Woche neu generiert.");
      router.refresh();
    });
  }

  function regenerateZahl() {
    startTransition(async () => {
      await saveContentAction(props.id, {
        content,
        titel,
        subtitle,
        zusatzMails,
      });
      await regenerateZahlAction(props.id);
      flash("ok", "Zahl der Woche neu generiert.");
      router.refresh();
    });
  }

  function sendTest() {
    if (!testEmail.trim()) {
      flash("err", "Bitte Test-E-Mail-Adresse eintragen.");
      return;
    }
    startTransition(async () => {
      await saveContentAction(props.id, {
        content,
        titel,
        subtitle,
        zusatzMails,
      });
      const res = await sendTestMailAction(props.id, testEmail.trim());
      if (res.ok) flash("ok", "Test-Mail an n8n übergeben.");
      else flash("err", res.error ?? "Test-Mail fehlgeschlagen.");
    });
  }

  function sendReal() {
    if (selectedCount === 0) {
      flash("err", "Bitte mindestens eine News auswählen.");
      return;
    }
    if (
      !confirm(
        `Newsletter #${props.ausgabeNr} jetzt an ${
          props.dbRecipientCount + manualMailCount
        } Empfänger (DB + manuell) als BCC-Draft an n8n schicken?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      await saveContentAction(props.id, {
        content,
        titel,
        subtitle,
        zusatzMails,
      });
      const res = await sendNewsletterAction(props.id);
      if (res.ok) flash("ok", `Versand ausgelöst an ${res.recipientCount} Empfänger.`);
      else flash("err", res.error ?? "Versand fehlgeschlagen.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            toast.kind === "ok"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.text}
        </div>
      )}

      {props.status === "FAILED" && props.fehlerText && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Versandfehler:</strong> {props.fehlerText}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-dark-slate-400 font-semibold tracking-wide uppercase">
            Ausgabe #{props.ausgabeNr} · KW {props.kw}/{props.jahr}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-dark-slate-900">Newsletter-Editor</h1>
            <NewsletterStatusBadge status={props.status} />
          </div>
        </div>
        <div className="text-sm text-dark-slate-500">
          Auswahl: <strong>{selectedCount} / {MAX_SELECTED}</strong>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-dark-slate-900 mb-4">Kopf</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-dark-slate-500 uppercase tracking-wide">Titel</span>
            <input
              type="text"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              disabled={readOnly}
              className="mt-1 w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-dark-slate-500 uppercase tracking-wide">Untertitel</span>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              disabled={readOnly}
              placeholder="Prompts, News und Insights – dein wöchentlicher Vorsprung."
              className="mt-1 w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
            />
          </label>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-slate-900">Prompt der Woche</h2>
            <button
              onClick={regeneratePrompt}
              disabled={pending || readOnly}
              className="flex items-center gap-1.5 text-xs text-dark-slate-500 hover:text-[#030386] disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Neu generieren
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={content.prompt.badge}
              onChange={(e) =>
                setContent((c) => ({ ...c, prompt: { ...c.prompt, badge: e.target.value } }))
              }
              disabled={readOnly}
              placeholder="Badge (z.B. COPILOT PREMIUM)"
              className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
            />
            <input
              type="text"
              value={content.prompt.title}
              onChange={(e) =>
                setContent((c) => ({ ...c, prompt: { ...c.prompt, title: e.target.value } }))
              }
              disabled={readOnly}
              placeholder="Titel"
              className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm font-semibold focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
            />
            <textarea
              value={content.prompt.body}
              onChange={(e) =>
                setContent((c) => ({ ...c, prompt: { ...c.prompt, body: e.target.value } }))
              }
              disabled={readOnly}
              rows={6}
              placeholder="Der Prompt-Text (wird mono gerendert)"
              className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm font-mono focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
            />
            <input
              type="text"
              value={content.prompt.tipp}
              onChange={(e) =>
                setContent((c) => ({ ...c, prompt: { ...c.prompt, tipp: e.target.value } }))
              }
              disabled={readOnly}
              placeholder="Sales-Tipp"
              className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-slate-900">Zahl der Woche</h2>
            <button
              onClick={regenerateZahl}
              disabled={pending || readOnly}
              className="flex items-center gap-1.5 text-xs text-dark-slate-500 hover:text-[#030386] disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Neu generieren
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={content.zahl.wert}
              onChange={(e) =>
                setContent((c) => ({ ...c, zahl: { ...c.zahl, wert: e.target.value } }))
              }
              disabled={readOnly}
              placeholder="z.B. 90%"
              className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-2xl font-bold focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
            />
            <input
              type="text"
              value={content.zahl.titel}
              onChange={(e) =>
                setContent((c) => ({ ...c, zahl: { ...c.zahl, titel: e.target.value } }))
              }
              disabled={readOnly}
              placeholder="Titel"
              className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm font-semibold focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
            />
            <textarea
              value={content.zahl.body}
              onChange={(e) =>
                setContent((c) => ({ ...c, zahl: { ...c.zahl, body: e.target.value } }))
              }
              disabled={readOnly}
              rows={3}
              placeholder="Kontext"
              className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-dark-slate-900">News-Kandidaten</h2>
            <p className="text-xs text-dark-slate-500 mt-0.5">
              Wähle bis zu {MAX_SELECTED} aus. Felder sind manuell editierbar.
            </p>
          </div>
          <button
            onClick={fetchMore}
            disabled={pending || readOnly}
            className="flex items-center gap-1.5 text-xs font-medium text-[#030386] hover:bg-dark-slate-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            5 weitere laden
          </button>
        </div>
        <div className="space-y-3">
          {content.candidates.map((item, idx) => {
            const selected = content.selectedIds.includes(item.id);
            const selectedIndex = selected
              ? content.selectedIds.indexOf(item.id) + 1
              : null;
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 transition-colors ${
                  selected
                    ? "border-[#030386] bg-[#030386]/5"
                    : "border-dark-slate-100 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <label className="flex-shrink-0 pt-1">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelect(item.id)}
                      disabled={readOnly}
                      className="w-4 h-4 text-[#030386]"
                    />
                  </label>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-dark-slate-400 font-mono">#{String(idx + 1).padStart(2, "0")}</span>
                      {selectedIndex && (
                        <span className="px-1.5 py-0.5 text-xs font-bold text-white bg-[#030386] rounded">
                          Position {selectedIndex}
                        </span>
                      )}
                      <input
                        type="text"
                        value={item.badge}
                        onChange={(e) => updateNewsField(item.id, "badge", e.target.value.toUpperCase())}
                        disabled={readOnly}
                        className="px-2 py-0.5 text-xs font-bold uppercase tracking-wide border border-dark-slate-200 rounded bg-dark-slate-50"
                        style={{ width: "120px" }}
                      />
                    </div>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateNewsField(item.id, "title", e.target.value)}
                      disabled={readOnly}
                      className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm font-semibold focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
                      placeholder="Titel"
                    />
                    <textarea
                      value={item.body}
                      onChange={(e) => updateNewsField(item.id, "body", e.target.value)}
                      disabled={readOnly}
                      rows={2}
                      className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
                      placeholder="Body"
                    />
                    <input
                      type="text"
                      value={item.cta}
                      onChange={(e) => updateNewsField(item.id, "cta", e.target.value)}
                      disabled={readOnly}
                      className="w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm text-[#030386] focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
                      placeholder="→ CTA"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={item.sourceLabel}
                        onChange={(e) => updateNewsField(item.id, "sourceLabel", e.target.value)}
                        disabled={readOnly}
                        className="rounded-lg border border-dark-slate-200 px-3 py-2 text-xs focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
                        placeholder="Quelle"
                      />
                      <input
                        type="url"
                        value={item.sourceUrl}
                        onChange={(e) => updateNewsField(item.id, "sourceUrl", e.target.value)}
                        disabled={readOnly}
                        className="col-span-2 rounded-lg border border-dark-slate-200 px-3 py-2 text-xs font-mono focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-dark-slate-900 mb-2">Empfänger & Versand</h2>
        <p className="text-xs text-dark-slate-500 mb-4">
          {props.dbRecipientCount} aus der Datenbank (Besteller + Teilnehmer) · {manualMailCount} manuell
        </p>
        <label className="block mb-4">
          <span className="text-xs font-semibold text-dark-slate-500 uppercase tracking-wide">
            Zusätzliche E-Mail-Adressen (semikolon-getrennt)
          </span>
          <textarea
            value={zusatzMails}
            onChange={(e) => setZusatzMails(e.target.value)}
            disabled={readOnly}
            rows={3}
            placeholder="max@mustermann.de; tom@beispiel.de"
            className="mt-1 w-full rounded-lg border border-dark-slate-200 px-3 py-2 text-sm font-mono focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            disabled={readOnly}
            placeholder="test@copilotberater.de"
            className="rounded-lg border border-dark-slate-200 px-3 py-2 text-sm focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
          />
          <button
            onClick={sendTest}
            disabled={pending || readOnly}
            className="flex items-center gap-1.5 px-4 py-2 bg-dark-slate-100 hover:bg-dark-slate-200 text-dark-slate-900 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            Test an mich
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={pending || readOnly}
            className="flex items-center gap-1.5 px-4 py-2 bg-dark-slate-100 hover:bg-dark-slate-200 text-dark-slate-900 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Speichern
          </button>
          <button
            onClick={updatePreview}
            disabled={pending}
            className="flex items-center gap-1.5 px-4 py-2 bg-dark-slate-100 hover:bg-dark-slate-200 text-dark-slate-900 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            Vorschau aktualisieren
          </button>
          <button
            onClick={sendReal}
            disabled={pending || readOnly || selectedCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#030386] hover:bg-[#040499] text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Versenden
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-dark-slate-900 mb-4">Live-Vorschau</h2>
        <iframe
          srcDoc={previewHtml}
          title="Newsletter-Vorschau"
          sandbox="allow-same-origin"
          className="w-full border border-dark-slate-200 rounded-lg"
          style={{ minHeight: "800px" }}
        />
      </div>
    </div>
  );
}
