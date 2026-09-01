"use client";

import { useState } from "react";

// Kurzformular "Unterlagen anfordern" der SYNAXON-Landingpage.
// Bewusst ohne Icon-Bibliothek und ohne Animationen: die Seite wird oft
// mobil und bei schlechter Verbindung aufgerufen.

type Status = "idle" | "loading" | "success" | "error";

interface SynaxonFormProps {
  /** bereinigte Herkunfts-Kennung aus ?src=, wird als verstecktes Feld mitgeschickt */
  src: string | null;
}

const inputClass =
  "w-full px-4 py-3 text-base text-white bg-slate-3 border border-slate-3 rounded-[10px] outline-none focus:border-green disabled:opacity-50";
const labelClass = "block text-sm font-semibold text-white/80 mb-1.5";

export function SynaxonForm({ src }: SynaxonFormProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [consent, setConsent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Schutz gegen doppeltes Absenden: läuft schon oder ist schon durch → nichts tun.
    if (status === "loading" || status === "success") return;

    const form = e.currentTarget;
    const data = new FormData(form);

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/synaxon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          firma: data.get("firma"),
          email: data.get("email"),
          telefon: data.get("telefon"),
          nachricht: data.get("nachricht"),
          consent,
          src: data.get("src"),
          website: data.get("website"),
          referrer: typeof document !== "undefined" ? document.referrer : "",
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(payload.error || "Da ist etwas schiefgelaufen. Bitte versuche es noch einmal.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Verbindungsfehler. Bitte prüfe deine Verbindung und versuche es noch einmal.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-slate-2 rounded-[14px] p-6 border border-green/40"
      >
        <p className="font-heading text-xl font-bold text-white mb-2">Danke, die Anfrage ist da.</p>
        <p className="text-white/70 text-base leading-relaxed m-0">
          Die Unterlagen kommen per Mail an die angegebene Adresse. Alexander oder jemand aus dem Team
          meldet sich innerhalb von zwei Werktagen persönlich bei dir.
        </p>
      </div>
    );
  }

  const busy = status === "loading";

  return (
    <form onSubmit={handleSubmit} className="relative bg-slate-2 rounded-[14px] p-6 grid gap-4">
      <div>
        <p className="text-white font-semibold text-lg m-0">
          Kein Termin möglich? Dann schicken wir dir die Unterlagen per Mail.
        </p>
        <p className="text-white/55 text-sm mt-1 m-0">
          Dauert eine Minute. Du hörst persönlich von uns, nicht von einem Autoresponder.
        </p>
      </div>

      <input type="hidden" name="src" value={src ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="syn-name" className={labelClass}>Name</label>
          <input id="syn-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={120} disabled={busy} className={inputClass} />
        </div>
        <div>
          <label htmlFor="syn-firma" className={labelClass}>Firma</label>
          <input id="syn-firma" name="firma" type="text" autoComplete="organization" required minLength={2} maxLength={160} disabled={busy} className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="syn-email" className={labelClass}>E-Mail</label>
          <input id="syn-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} className={inputClass} />
        </div>
        <div>
          <label htmlFor="syn-telefon" className={labelClass}>
            Telefon <span className="font-normal text-white/45">(optional)</span>
          </label>
          <input id="syn-telefon" name="telefon" type="tel" autoComplete="tel" maxLength={60} disabled={busy} className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="syn-nachricht" className={labelClass}>
          Worum geht es? <span className="font-normal text-white/45">(optional)</span>
        </label>
        <textarea
          id="syn-nachricht"
          name="nachricht"
          rows={3}
          maxLength={1000}
          disabled={busy}
          placeholder="Zum Beispiel: Wir haben 40 Copilot-Lizenzen bei einem Kunden und keinen Plan dafür."
          className={`${inputClass} resize-y placeholder:text-white/35`}
        />
      </div>

      {/* Honeypot: für Menschen unsichtbar, Bots füllen es aus. Der Server verwirft solche Anfragen still. */}
      <div className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
        <label htmlFor="syn-website">Website</label>
        <input id="syn-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex items-start gap-3 text-sm text-white/70 leading-relaxed cursor-pointer">
        <input
          type="checkbox"
          name="consent"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={busy}
          className="mt-0.5 w-[18px] h-[18px] flex-none accent-green"
        />
        <span>
          Ich bin einverstanden, dass NextSkills meine Angaben zur Bearbeitung meiner Anfrage speichert und
          mich dazu kontaktiert. Hinweise in der{" "}
          <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-green underline">
            Datenschutzerklärung
          </a>
          .
        </span>
      </label>

      {status === "error" && (
        <p role="alert" className="m-0 p-3 rounded-lg bg-white/5 border border-white/15 text-white text-sm">
          {errorMsg}
        </p>
      )}

      <button type="submit" disabled={busy || !consent} className="btn-primary w-full">
        {busy ? "Wird gesendet…" : "Unterlagen anfordern"}
      </button>
    </form>
  );
}
