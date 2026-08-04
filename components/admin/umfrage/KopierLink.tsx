"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Kopiert einen (persönlichen) Umfrage-Link in die Zwischenablage. */
export function KopierLink({ link, title }: { link: string; title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Zwischenablage nicht verfügbar – kein Fallback nötig.
        }
      }}
      className="inline-flex items-center gap-1 text-xs font-semibold text-[#030386] hover:underline"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Kopiert" : "Link kopieren"}
    </button>
  );
}
