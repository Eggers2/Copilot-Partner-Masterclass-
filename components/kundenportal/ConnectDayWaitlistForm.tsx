"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ClipboardList } from "lucide-react";
import { joinWaitlistAction } from "@/app/kundenportal/connect-day/actions";

interface BestellungOption {
  id: number;
  bestellNr: string;
  firma: string;
  klasseName: string;
}

/**
 * Wartelisten-Formular im Kundenportal. Wird angezeigt, sobald der Connect Day
 * ausgebucht ist. Sammelt Kontakt + gewünschte Personenzahl; das Nachrücken
 * bei Stornos übernimmt der Betreiber manuell (keine automatische Anmeldung).
 */
export function ConnectDayWaitlistForm({
  bestellungen,
  maxPersonen,
  defaultEmail,
}: {
  bestellungen: BestellungOption[];
  maxPersonen: number;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bestellungId, setBestellungId] = useState<number>(bestellungen[0].id);
  const [kontaktName, setKontaktName] = useState("");
  const [kontaktEmail, setKontaktEmail] = useState(defaultEmail);
  const [personen, setPersonen] = useState(1);
  const [notiz, setNotiz] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (!kontaktName.trim()) {
      setError("Bitte gib einen Ansprechpartner an.");
      return;
    }
    if (!kontaktEmail.includes("@")) {
      setError("Bitte gib eine gültige E-Mail-Adresse an.");
      return;
    }
    startTransition(async () => {
      const res = await joinWaitlistAction({
        bestellungId,
        kontaktName: kontaktName.trim(),
        kontaktEmail: kontaktEmail.trim(),
        personen,
        notiz: notiz.trim() || undefined,
      });
      if (res.error) {
        setError(res.error);
        router.refresh();
      } else {
        router.refresh();
      }
    });
  };

  const maxWahl = Math.max(1, maxPersonen);

  return (
    <div className="bg-white rounded-2xl border border-cool shadow-sm p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate font-heading mb-1">
        <ClipboardList className="w-5 h-5 text-green" />
        Auf die Warteliste
      </h2>
      <p className="text-sm text-gray mb-6">
        Der Connect Day ist aktuell ausgebucht. Trag dich unverbindlich auf die
        Warteliste ein – wird ein Platz frei (Stornos kommen vor), melden wir
        uns bei dir. Es entsteht dadurch noch keine Buchung und keine Rechnung.
      </p>

      {bestellungen.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate mb-1.5">
            Bestellung
          </label>
          <select
            value={bestellungId}
            onChange={(e) => setBestellungId(Number(e.target.value))}
            className="w-full rounded-lg border border-cool px-3 py-2 text-sm text-slate focus:border-green focus:outline-none"
          >
            {bestellungen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.firma} · {b.bestellNr} ({b.klasseName})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate mb-1.5">
            Ansprechpartner
          </label>
          <input
            type="text"
            value={kontaktName}
            onChange={(e) => setKontaktName(e.target.value)}
            placeholder="Vor- und Nachname"
            maxLength={120}
            className="w-full rounded-lg border border-cool px-3 py-2 text-sm text-slate placeholder:text-gray/60 focus:border-green focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate mb-1.5">
            E-Mail
          </label>
          <input
            type="email"
            value={kontaktEmail}
            onChange={(e) => setKontaktEmail(e.target.value)}
            placeholder="name@firma.de"
            maxLength={200}
            className="w-full rounded-lg border border-cool px-3 py-2 text-sm text-slate placeholder:text-gray/60 focus:border-green focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate mb-1.5">
            Gewünschte Plätze
          </label>
          <select
            value={personen}
            onChange={(e) => setPersonen(Number(e.target.value))}
            className="w-full rounded-lg border border-cool px-3 py-2 text-sm text-slate focus:border-green focus:outline-none"
          >
            {Array.from({ length: maxWahl }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "Person" : "Personen"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate mb-1.5">
            Notiz (optional)
          </label>
          <input
            type="text"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="z.B. Wunschteilnehmer, Anmerkungen"
            maxLength={200}
            className="w-full rounded-lg border border-cool px-3 py-2 text-sm text-slate placeholder:text-gray/60 focus:border-green focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="mt-5 w-full sm:w-auto px-6 py-3 bg-green hover:bg-green-d text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Wird eingetragen …
          </span>
        ) : (
          "Auf die Warteliste setzen"
        )}
      </button>
    </div>
  );
}
