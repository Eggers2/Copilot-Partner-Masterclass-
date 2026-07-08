"use client";

import { useState, useTransition } from "react";
import { Save, UserX } from "lucide-react";
import { updateAnwesenheitIgnorierlisteAction } from "@/app/admin/actions";

/**
 * Pflege der globalen Ignorierliste für den Anwesenheits-Abgleich:
 * Moderatoren, Co-Moderatoren und Sponsoren, die in den Teams-Terminen
 * auftauchen dürfen, ohne als Abweichung gemeldet zu werden.
 */
export function AnwesenheitIgnorierliste({
  klasseSlug,
  emails,
}: {
  klasseSlug: string;
  emails: string[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(emails.join("\n"));
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateAnwesenheitIgnorierlisteAction(klasseSlug, value);
      setMsg(
        res.error
          ? { kind: "err", text: res.error }
          : { kind: "ok", text: `Gespeichert (${res.count} Adressen).` }
      );
    });
  }

  return (
    <div className="rounded-lg border border-dark-slate-200 bg-dark-slate-50/40 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-dark-slate-600 hover:text-[#030386]"
      >
        <UserX className="w-4 h-4" />
        Ignorierliste ({emails.length}) – Moderation &amp; Sponsoren
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-dark-slate-500">
            Diese Adressen werden beim Abgleich nicht als Abweichung gemeldet
            (gilt für alle Klassen). Eine Adresse pro Zeile.
          </p>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            spellCheck={false}
            className="w-full px-3 py-2 text-sm font-mono border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            placeholder={"moderator@example.de\nsponsor@example.de"}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isPending ? "Wird gespeichert…" : "Speichern"}
            </button>
            {msg && (
              <span
                className={`text-sm ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}
              >
                {msg.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
