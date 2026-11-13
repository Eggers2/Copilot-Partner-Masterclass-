"use client";

import { useRef, useState } from "react";

// Prompt-Karte mit Kopieren-Knopf für die Übungsseite (/uebungen).
// Klappt die Zwischenablage nicht (ältere Browser, In-App-Browser), wird der
// Text markiert, damit die Teilnehmer ihn von Hand kopieren können.
export function PromptKarte({ label, text }: { label: string; text: string }) {
  const pre = useRef<HTMLPreElement>(null);
  const [status, setStatus] = useState<"" | "kopiert" | "markiert">("");

  function markieren() {
    if (!pre.current) return;
    const range = document.createRange();
    range.selectNodeContents(pre.current);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    setStatus("markiert");
  }

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("kopiert");
      setTimeout(() => setStatus(""), 1800);
    } catch {
      markieren();
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-green bg-slate-3/60 p-4">
      <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.15em] text-green">
        {label}
      </p>
      <pre
        ref={pre}
        className="m-0 mb-3 whitespace-pre-wrap font-body text-[17px] leading-relaxed text-white"
      >
        {text}
      </pre>
      <button
        type="button"
        onClick={kopieren}
        className={`rounded-lg px-4 py-2 text-[15px] font-bold text-slate ${
          status === "kopiert" ? "bg-white" : "bg-green hover:bg-green-d"
        }`}
      >
        {status === "kopiert"
          ? "Kopiert"
          : status === "markiert"
            ? "Markiert, jetzt kopieren"
            : "Kopieren"}
      </button>
    </div>
  );
}
