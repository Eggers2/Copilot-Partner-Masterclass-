"use client";

import { useState, useMemo } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";

type FormState = "idle" | "loading" | "success" | "error";
type PacketKey = "starter" | "team" | "business";
type Zahlungsmodell = "jahresabo" | "monatlich";
type Land = "DE" | "AT" | "CH";

const PACKAGES: Record<
  PacketKey,
  { label: string; users: number; usersLabel: string; yearly: number; monthly: number }
> = {
  starter: { label: "Starter", users: 3, usersLabel: "3 User", yearly: 8900, monthly: 890 },
  team: { label: "Team", users: 6, usersLabel: "6 User", yearly: 9900, monthly: 1090 },
  business: { label: "Business", users: 15, usersLabel: "bis 15 User", yearly: 14900, monthly: 1490 },
};

const LAENDER: Record<Land, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
};

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents);
}

function calculateMwst(land: Land, ustId: string, preisNetto: number) {
  let mwstSatz = 19;
  let reverseCharge = false;
  let reverseChargeHinweis = "";

  if (land === "AT") {
    if (ustId.trim().length > 0) {
      mwstSatz = 0;
      reverseCharge = true;
      reverseChargeHinweis =
        "Reverse Charge gem. Art. 196 MwSt-Richtlinie – Steuerschuldnerschaft des Leistungsempfängers";
    } else {
      mwstSatz = 20;
    }
  } else if (land === "CH") {
    mwstSatz = 0;
    reverseChargeHinweis = "Leistung nicht im Inland steuerbar (Drittland)";
  }

  const mwstBetrag = Math.round(preisNetto * (mwstSatz / 100) * 100) / 100;
  const preisBrutto = preisNetto + mwstBetrag;

  return { mwstSatz, mwstBetrag, preisBrutto, reverseCharge, reverseChargeHinweis };
}

export function OrderForm() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successEmail, setSuccessEmail] = useState("");

  // Selections
  const [paket, setPaket] = useState<PacketKey>("team");
  const [zahlungsmodell, setZahlungsmodell] = useState<Zahlungsmodell>("jahresabo");

  // Company fields
  const [firma, setFirma] = useState("");
  const [strasse, setStrasse] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [land, setLand] = useState<Land>("DE");
  const [ustId, setUstId] = useState("");

  // Contact fields
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [position, setPosition] = useState("");

  // Notes
  const [anmerkungen, setAnmerkungen] = useState("");

  // AGB
  const [agbAccepted, setAgbAccepted] = useState(false);

  // Computed values
  const pkg = PACKAGES[paket];
  const preisNetto = zahlungsmodell === "jahresabo" ? pkg.yearly : pkg.monthly;
  const preisLabel = zahlungsmodell === "jahresabo" ? "/ Jahr" : "/ Monat";

  const mwst = useMemo(
    () => calculateMwst(land, ustId, preisNetto),
    [land, ustId, preisNetto]
  );

  const ustIdRequired = land === "AT" || land === "CH";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/bestellen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paket,
          zahlungsmodell,
          firma,
          strasse,
          plz,
          ort,
          land,
          ustId,
          vorname,
          nachname,
          email,
          telefon,
          position,
          anmerkungen,
          website: (document.getElementById("website") as HTMLInputElement)?.value || "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(
          data.error ||
            "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt."
        );
        setFormState("error");
        return;
      }

      setSuccessEmail(email);
      setFormState("success");
    } catch {
      setErrorMsg(
        "Verbindungsfehler. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt."
      );
      setFormState("error");
    }
  };

  if (formState === "success") {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 px-4">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-ns-text mb-4">
          Vielen Dank für Ihre Bestellung!
        </h2>
        <p className="text-ns-text/80 text-lg mb-2">
          Wir haben Ihre Bestellung erhalten und senden Ihnen in Kürze eine
          Rechnung per E-Mail an{" "}
          <strong className="text-ns-text">{successEmail}</strong>.
        </p>
        <p className="text-ns-text/60 mt-6">
          Bei Fragen erreichen Sie uns unter{" "}
          <a
            href="mailto:info@next-skills.de"
            className="text-ns-blue-500 hover:underline"
          >
            info@next-skills.de
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-10 px-4 pb-16" noValidate>
      {/* Honeypot */}
      <div style={{ position: "absolute", left: "-9999px", opacity: 0 }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Sektion A: Paketwahl */}
      <section>
        <h2 className="text-xl font-bold text-ns-text mb-1">Paket wählen</h2>
        <p className="text-sm text-ns-text/60 mb-4">Alle Preise zzgl. MwSt.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(Object.keys(PACKAGES) as PacketKey[]).map((key) => {
            const p = PACKAGES[key];
            const isSelected = paket === key;
            const isRecommended = key === "team";
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPaket(key)}
                className={`relative text-left p-6 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-ns-blue-500 shadow-lg bg-white"
                    : "border-dark-slate-200 bg-white hover:border-dark-slate-300"
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-3 left-4 bg-ns-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Empfohlen
                  </span>
                )}
                <h3 className="text-lg font-bold text-ns-text mt-1">{p.label}</h3>
                <p className="text-sm text-ns-text/60 mb-3">{p.usersLabel}</p>
                <p className="text-2xl font-bold text-ns-blue-500">
                  {formatEuro(p.yearly)}
                  <span className="text-sm font-normal text-ns-text/60"> / Jahr</span>
                </p>
                <p className="text-sm text-ns-text/60 mt-1">
                  oder {formatEuro(p.monthly)} / Monat
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sektion B: Zahlungsmodell */}
      <section>
        <h2 className="text-xl font-bold text-ns-text mb-4">Zahlungsmodell</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setZahlungsmodell("jahresabo")}
            className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
              zahlungsmodell === "jahresabo"
                ? "border-ns-blue-500 shadow-lg bg-white"
                : "border-dark-slate-200 bg-white hover:border-dark-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-ns-text">Jahresabo</h3>
              <span className="text-lg font-bold text-ns-blue-500">
                {formatEuro(pkg.yearly)}
              </span>
            </div>
            <p className="text-sm text-ns-text/60">
              Einmalige Jahresrechnung – Sie sparen bis zu 2 Monate
            </p>
          </button>
          <button
            type="button"
            onClick={() => setZahlungsmodell("monatlich")}
            className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
              zahlungsmodell === "monatlich"
                ? "border-ns-blue-500 shadow-lg bg-white"
                : "border-dark-slate-200 bg-white hover:border-dark-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-ns-text">Monatliche Zahlung</h3>
              <span className="text-lg font-bold text-ns-blue-500">
                {formatEuro(pkg.monthly)}
              </span>
            </div>
            <p className="text-sm text-ns-text/60">
              12 monatliche Rechnungen – flexibel kündbar nach Mindestlaufzeit
            </p>
          </button>
        </div>
      </section>

      {/* Sektion C: Unternehmensdaten */}
      <section>
        <h2 className="text-xl font-bold text-ns-text mb-4">Unternehmensdaten</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="firma" className="block text-sm font-medium text-ns-text mb-1">
              Firmenname *
            </label>
            <input
              id="firma"
              type="text"
              required
              minLength={2}
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="strasse" className="block text-sm font-medium text-ns-text mb-1">
              Straße + Hausnummer *
            </label>
            <input
              id="strasse"
              type="text"
              required
              value={strasse}
              onChange={(e) => setStrasse(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="plz" className="block text-sm font-medium text-ns-text mb-1">
              PLZ *
            </label>
            <input
              id="plz"
              type="text"
              required
              pattern="\d{4,5}"
              value={plz}
              onChange={(e) => setPlz(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="ort" className="block text-sm font-medium text-ns-text mb-1">
              Ort *
            </label>
            <input
              id="ort"
              type="text"
              required
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="land" className="block text-sm font-medium text-ns-text mb-1">
              Land *
            </label>
            <select
              id="land"
              required
              value={land}
              onChange={(e) => {
                setLand(e.target.value as Land);
                setUstId("");
              }}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50 bg-white"
            >
              {(Object.keys(LAENDER) as Land[]).map((key) => (
                <option key={key} value={key}>
                  {LAENDER[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ustId" className="block text-sm font-medium text-ns-text mb-1">
              USt-IdNr. {ustIdRequired && "*"}
            </label>
            <input
              id="ustId"
              type="text"
              required={ustIdRequired}
              value={ustId}
              onChange={(e) => setUstId(e.target.value)}
              disabled={formState === "loading"}
              placeholder={
                land === "DE"
                  ? "DE123456789"
                  : land === "AT"
                  ? "ATU12345678"
                  : "CHE-123.456.789"
              }
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50"
            />
            {ustIdRequired && (
              <p className="text-xs text-ns-blue-500 mt-1">
                Für die steuerfreie Abrechnung benötigen wir Ihre USt-IdNr.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Sektion D: Ansprechpartner */}
      <section>
        <h2 className="text-xl font-bold text-ns-text mb-4">Ansprechpartner</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="vorname" className="block text-sm font-medium text-ns-text mb-1">
              Vorname *
            </label>
            <input
              id="vorname"
              type="text"
              required
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="nachname" className="block text-sm font-medium text-ns-text mb-1">
              Nachname *
            </label>
            <input
              id="nachname"
              type="text"
              required
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ns-text mb-1">
              E-Mail *
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={formState === "loading"}
              placeholder="max@firma.de"
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="telefon" className="block text-sm font-medium text-ns-text mb-1">
              Telefon
            </label>
            <input
              id="telefon"
              type="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              disabled={formState === "loading"}
              placeholder="+49 221 12345"
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="position" className="block text-sm font-medium text-ns-text mb-1">
              Position / Rolle
            </label>
            <input
              id="position"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              disabled={formState === "loading"}
              placeholder="z.B. Geschäftsführer, IT-Leiter"
              className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>
      </section>

      {/* Sektion E: Anmerkungen */}
      <section>
        <h2 className="text-xl font-bold text-ns-text mb-4">Anmerkungen</h2>
        <div>
          <label htmlFor="anmerkungen" className="block text-sm font-medium text-ns-text mb-1">
            Haben Sie Fragen oder Anmerkungen?
          </label>
          <textarea
            id="anmerkungen"
            maxLength={500}
            rows={4}
            value={anmerkungen}
            onChange={(e) => setAnmerkungen(e.target.value)}
            disabled={formState === "loading"}
            className="w-full px-4 py-3 text-sm border border-dark-slate-200 rounded-xl focus:border-ns-blue-500 focus:outline-none disabled:opacity-50 resize-none"
          />
          <p className="text-xs text-ns-text/50 text-right mt-1">
            {anmerkungen.length}/500 Zeichen
          </p>
        </div>
      </section>

      {/* Sektion F: Zusammenfassung & Absenden */}
      <section>
        <div className="bg-ns-light rounded-xl p-6 border border-ns-accent">
          <h2 className="text-xl font-bold text-ns-text mb-4">Ihre Bestellung</h2>
          <div className="space-y-2 text-sm text-ns-text">
            <div className="flex justify-between">
              <span>Paket:</span>
              <span className="font-medium">
                {pkg.label} ({pkg.usersLabel})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Zahlung:</span>
              <span className="font-medium">
                {zahlungsmodell === "jahresabo" ? "Jahresabo" : "Monatliche Zahlung"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Preis:</span>
              <span className="font-medium">
                {formatEuro(preisNetto)} netto {preisLabel}
              </span>
            </div>
            <div className="flex justify-between">
              <span>zzgl. MwSt. ({mwst.mwstSatz}%):</span>
              <span className="font-medium">{formatEuro(mwst.mwstBetrag)}</span>
            </div>
            <hr className="border-ns-accent my-2" />
            <div className="flex justify-between text-base font-bold">
              <span>Gesamt:</span>
              <span>
                {formatEuro(mwst.preisBrutto)} brutto {preisLabel}
              </span>
            </div>
          </div>

          {mwst.reverseChargeHinweis && (
            <p className="text-xs text-ns-blue-500 mt-3 bg-white/60 rounded-lg p-2">
              {mwst.reverseChargeHinweis}
            </p>
          )}

          <div className="mt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agbAccepted}
                onChange={(e) => setAgbAccepted(e.target.checked)}
                required
                className="mt-0.5 w-4 h-4 accent-ns-blue-500"
              />
              <span className="text-sm text-ns-text">
                Ich akzeptiere die AGB und habe die Datenschutzerklärung gelesen. *
              </span>
            </label>
          </div>

          {formState === "error" && (
            <div
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mt-4"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={formState === "loading" || !agbAccepted}
            className="w-full mt-6 py-4 bg-ns-blue-500 hover:bg-ns-blue-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-base"
          >
            {formState === "loading" ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Bestellung wird verarbeitet...
              </>
            ) : (
              "Verbindlich bestellen"
            )}
          </button>
        </div>
      </section>
    </form>
  );
}
