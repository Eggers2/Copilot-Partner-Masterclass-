"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UtmWerte } from "@/lib/event-download/lead";

// Formular für den Folien-Download einer Veranstaltung (lib/event-download).
// Wird im Saal per QR-Code am Handy geöffnet: einspaltig, große Felder,
// keine Icon-Bibliothek.

type Status = "idle" | "loading" | "error";

interface EventDownloadFormProps {
  /** Pfad der Veranstaltung ohne Schrägstrich, z.B. "adn-schweiz" */
  slug: string;
  /** UTM-Werte direkt aus der aufgerufenen URL, nicht aus dem utm-tracker */
  utm: UtmWerte;
}

const inputClass =
  "w-full px-4 py-3 text-base text-white bg-slate-3 border border-slate-3 rounded-[10px] outline-none focus:border-green disabled:opacity-50";
const labelClass = "block text-sm font-semibold text-white/80 mb-1.5";
const checkboxClass = "mt-0.5 w-[20px] h-[20px] flex-none accent-green";

export function EventDownloadForm({ slug, utm }: EventDownloadFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Schutz gegen doppeltes Absenden.
    if (status === "loading" || done) return;

    const data = new FormData(e.currentTarget);

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          name: data.get("name"),
          firma: data.get("firma"),
          privacy,
          marketing,
          website: data.get("website"),
          referrer: typeof document !== "undefined" ? document.referrer : "",
          ...utm,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(payload.error || "Da ist etwas schiefgelaufen. Bitte versuchen Sie es noch einmal.");
        setStatus("error");
        return;
      }

      setDone(true);
      router.push(`/${slug}/danke`);
    } catch {
      setErrorMsg("Verbindungsfehler. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es noch einmal.");
      setStatus("error");
    }
  };

  const busy = status === "loading" || done;

  return (
    <form onSubmit={handleSubmit} className="relative bg-slate-2 rounded-[14px] p-5 sm:p-6 grid gap-4">
      <div>
        <label htmlFor="event-email" className={labelClass}>E-Mail</label>
        <input
          id="event-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          maxLength={254}
          disabled={busy}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="event-name" className={labelClass}>
          Name <span className="font-normal text-white/45">(optional)</span>
        </label>
        <input id="event-name" name="name" type="text" autoComplete="name" maxLength={120} disabled={busy} className={inputClass} />
      </div>

      <div>
        <label htmlFor="event-firma" className={labelClass}>
          Firma <span className="font-normal text-white/45">(optional)</span>
        </label>
        <input id="event-firma" name="firma" type="text" autoComplete="organization" maxLength={160} disabled={busy} className={inputClass} />
      </div>

      {/* Honeypot: für Menschen unsichtbar, Bots füllen es aus. Der Server verwirft solche Anfragen still. */}
      <div className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
        <label htmlFor="event-website">Website</label>
        <input id="event-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex items-start gap-3 text-sm text-white/75 leading-relaxed cursor-pointer">
        <input
          type="checkbox"
          name="privacy"
          required
          checked={privacy}
          onChange={(e) => setPrivacy(e.target.checked)}
          disabled={busy}
          className={checkboxClass}
        />
        <span>
          Ich habe die{" "}
          <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-green underline">
            Datenschutzerklärung
          </a>{" "}
          gelesen.
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-white/75 leading-relaxed cursor-pointer">
        <input
          type="checkbox"
          name="marketing"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          disabled={busy}
          className={checkboxClass}
        />
        <span>
          Ich möchte Informationen zur Copilot Partner Masterclass per E-Mail erhalten.{" "}
          <span className="text-white/45">(optional)</span>
        </span>
      </label>

      {status === "error" && (
        <p role="alert" className="m-0 p-3 rounded-lg bg-white/5 border border-white/15 text-white text-sm">
          {errorMsg}
        </p>
      )}

      <button type="submit" disabled={busy || !privacy} className="btn-primary w-full text-lg">
        {busy ? "Wird gesendet…" : "Folien erhalten"}
      </button>
    </form>
  );
}
