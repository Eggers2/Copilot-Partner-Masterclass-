"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";

type FormState = "idle" | "loading" | "success" | "error";

export function WebinarRegistrationForm({ slug }: { slug: string }) {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const firstName = formData.get("firstName") as string;
    const company = formData.get("company") as string;

    try {
      const res = await fetch(`/api/webinars/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, company }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ein Fehler ist aufgetreten.");
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-dark-slate-900 mb-2">
          Anmeldung erfolgreich!
        </h3>
        <p className="text-dark-slate-500">
          Du erhältst in Kürze eine Bestätigungs-E-Mail mit dem Webinar-Link.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-dark-slate-700 mb-1">
          E-Mail-Adresse *
        </label>
        <input
          name="email"
          type="email"
          required
          disabled={state === "loading"}
          placeholder="deine@email.de"
          className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-[#030386] focus:outline-none disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-dark-slate-700 mb-1">
          Vorname *
        </label>
        <input
          name="firstName"
          required
          disabled={state === "loading"}
          placeholder="Max"
          className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-[#030386] focus:outline-none disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-dark-slate-700 mb-1">
          Firmenname *
        </label>
        <input
          name="company"
          required
          disabled={state === "loading"}
          placeholder="Deine Firma GmbH"
          className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-[#030386] focus:outline-none disabled:opacity-50"
        />
      </div>

      {state === "error" && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={state === "loading"}
        className="w-full py-3 bg-[#030386] hover:bg-[#05015B] disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
      >
        {state === "loading" ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Wird angemeldet...
          </>
        ) : (
          "Kostenlos anmelden"
        )}
      </button>

      <p className="text-center text-dark-slate-400 text-xs">
        Mit der Anmeldung stimmst du dem Erhalt von E-Mail-Benachrichtigungen
        zu.
      </p>
    </form>
  );
}
