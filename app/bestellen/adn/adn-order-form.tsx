"use client";

import { useState, useMemo } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import type { KlasseOption } from "../order-form";

type FormState = "idle" | "loading" | "success" | "error";
type PacketKey = "starter" | "team" | "business";
type Land = "DE" | "AT" | "CH";
type AdnChannel = "ADN_50" | "ADN_15";

const PACKAGES: Record<
  PacketKey,
  { label: string; users: number; usersLabel: string; yearly: number }
> = {
  starter: { label: "Starter", users: 3, usersLabel: "3 User", yearly: 8900 },
  team: { label: "Team", users: 6, usersLabel: "6 User", yearly: 9900 },
  business: { label: "Business", users: 15, usersLabel: "bis 15 User", yearly: 14900 },
};

const LAENDER: Record<Land, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
};

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
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

function getInvoicedPreisNetto(list: number, channel: AdnChannel): number {
  if (channel === "ADN_15") return Math.round(list * 0.85 * 100) / 100;
  return list;
}

export function AdnOrderForm({ klassen }: { klassen: KlasseOption[] }) {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successBestellNr, setSuccessBestellNr] = useState("");

  const [adnChannel, setAdnChannel] = useState<AdnChannel>("ADN_50");
  const [paket, setPaket] = useState<PacketKey>("team");
  const [klasseId, setKlasseId] = useState<string>(klassen[0]?.id ?? "");

  const [firma, setFirma] = useState("");
  const [strasse, setStrasse] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [land, setLand] = useState<Land>("DE");
  const [ustId, setUstId] = useState("");

  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [position, setPosition] = useState("");
  const [anmerkungen, setAnmerkungen] = useState("");

  const pkg = PACKAGES[paket];
  const listPreis = pkg.yearly;
  const preisNetto = getInvoicedPreisNetto(listPreis, adnChannel);
  const preisLabel = "/ Jahr";

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
      const res = await fetch("/api/bestellen/adn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paket,
          zahlungsmodell: "jahresabo",
          adnChannel,
          klasseId: klasseId || undefined,
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

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Es ist ein Fehler aufgetreten.");
        setFormState("error");
        return;
      }

      setSuccessBestellNr(data.bestellNr ?? "");
      setFormState("success");
    } catch {
      setErrorMsg("Verbindungsfehler. Bitte versuchen Sie es erneut.");
      setFormState("error");
    }
  };

  if (formState === "success") {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 px-4">
        <CheckCircle className="w-20 h-20 text-green mx-auto mb-6" />
        <h2
          className="text-2xl font-bold text-slate mb-4"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          ADN-Bestellung angelegt
        </h2>
        <p className="text-gray text-lg">
          Bestell-Nr: <strong className="text-slate">{successBestellNr}</strong>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-10 px-4 pb-16" noValidate>
      <div style={{ position: "absolute", left: "-9999px", opacity: 0 }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {/* ADN-Modell */}
      <section>
        <h2
          className="text-xl font-bold text-slate mb-1"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          ADN-Abrechnungsmodell
        </h2>
        <p className="text-sm text-gray mb-4">
          Welches Abrechnungsmodell wurde mit ADN vereinbart?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setAdnChannel("ADN_50")}
            className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
              adnChannel === "ADN_50"
                ? "border-green shadow-lg bg-white"
                : "border-cool bg-white hover:border-gray/30"
            }`}
          >
            <h3 className="font-bold text-slate mb-1">ADN 50/50</h3>
            <p className="text-xs text-gray">
              ADN zahlt 50%, wir fakturieren 100% des Listenpreises an ADN.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setAdnChannel("ADN_15")}
            className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
              adnChannel === "ADN_15"
                ? "border-green shadow-lg bg-white"
                : "border-cool bg-white hover:border-gray/30"
            }`}
          >
            <h3 className="font-bold text-slate mb-1">ADN 85/15</h3>
            <p className="text-xs text-gray">
              Wir fakturieren 85% des Listenpreises an ADN; ADN fakturiert weiter.
            </p>
          </button>
        </div>
      </section>

      {/* Paket */}
      <section>
        <h2
          className="text-xl font-bold text-slate mb-1"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Paket wählen
        </h2>
        <p className="text-sm text-gray mb-4">Alle Preise zzgl. MwSt.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(Object.keys(PACKAGES) as PacketKey[]).map((key) => {
            const p = PACKAGES[key];
            const isSelected = paket === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPaket(key)}
                className={`text-left p-6 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-green shadow-lg bg-white"
                    : "border-cool bg-white hover:border-gray/30"
                }`}
              >
                <h3 className="text-lg font-bold text-slate">{p.label}</h3>
                <p className="text-sm text-gray mb-3">{p.usersLabel}</p>
                <p className="text-2xl font-bold text-green">
                  {formatEuro(p.yearly)}
                  <span className="text-sm font-normal text-gray"> / Jahr (Liste)</span>
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Klasse */}
      {klassen.length > 0 && (
        <section>
          <h2
            className="text-xl font-bold text-slate mb-1"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Programmstart
          </h2>
          <p className="text-sm text-gray mb-4">Welcher Kohorte soll der Partner zugeordnet werden?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {klassen.map((k) => {
              const isSelected = klasseId === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKlasseId(k.id)}
                  className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-green shadow-lg bg-white"
                      : "border-cool bg-white hover:border-gray/30"
                  }`}
                >
                  <h3 className="font-bold text-slate mb-1">{k.name}</h3>
                  <p className="text-xs text-gray">
                    Kickoff: {new Date(k.kickoffDate).toLocaleDateString("de-DE")}
                  </p>
                  <p className="text-xs text-gray">
                    {new Date(k.startDate).toLocaleDateString("de-DE")} –{" "}
                    {new Date(k.endDate).toLocaleDateString("de-DE")}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Partner-Daten (für CRM) */}
      <section>
        <h2
          className="text-xl font-bold text-slate mb-1"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Partner-Daten
        </h2>
        <p className="text-sm text-gray mb-4">
          Daten des Partners (Endkunden), nicht von ADN. Adresse landet im CRM.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="firma" className="block text-sm font-medium text-slate mb-1">
              Firma *
            </label>
            <input
              id="firma"
              type="text"
              required
              minLength={2}
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 text-slate"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="strasse" className="block text-sm font-medium text-slate mb-1">
              Straße + Hausnummer *
            </label>
            <input
              id="strasse"
              type="text"
              required
              value={strasse}
              onChange={(e) => setStrasse(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 text-slate"
            />
          </div>
          <div>
            <label htmlFor="plz" className="block text-sm font-medium text-slate mb-1">
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
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 text-slate"
            />
          </div>
          <div>
            <label htmlFor="ort" className="block text-sm font-medium text-slate mb-1">
              Ort *
            </label>
            <input
              id="ort"
              type="text"
              required
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 text-slate"
            />
          </div>
          <div>
            <label htmlFor="land" className="block text-sm font-medium text-slate mb-1">
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
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 bg-white text-slate"
            >
              {(Object.keys(LAENDER) as Land[]).map((key) => (
                <option key={key} value={key}>
                  {LAENDER[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ustId" className="block text-sm font-medium text-slate mb-1">
              USt-IdNr. {ustIdRequired && "*"}
            </label>
            <input
              id="ustId"
              type="text"
              required={ustIdRequired}
              value={ustId}
              onChange={(e) => setUstId(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 text-slate"
            />
          </div>
        </div>
      </section>

      {/* Ansprechpartner */}
      <section>
        <h2
          className="text-xl font-bold text-slate mb-4"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Ansprechpartner
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Vorname *</label>
            <input
              type="text"
              required
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 text-slate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Nachname *</label>
            <input
              type="text"
              required
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 text-slate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">E-Mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 text-slate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Telefon</label>
            <input
              type="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 text-slate"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate mb-1">Position / Rolle</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 text-slate"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate mb-1">Anmerkungen</label>
            <textarea
              maxLength={500}
              rows={3}
              value={anmerkungen}
              onChange={(e) => setAnmerkungen(e.target.value)}
              disabled={formState === "loading"}
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none disabled:opacity-50 resize-none text-slate"
            />
          </div>
        </div>
      </section>

      {/* Zusammenfassung */}
      <section>
        <div className="bg-cool rounded-xl p-6 border border-cool">
          <h2
            className="text-xl font-bold text-slate mb-4"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Zusammenfassung
          </h2>
          <div className="space-y-2 text-sm text-slate">
            <div className="flex justify-between">
              <span className="text-gray">ADN-Modell:</span>
              <span className="font-medium">
                {adnChannel === "ADN_50" ? "ADN 50/50 (100% an ADN)" : "ADN 85/15 (85% an ADN)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray">Paket:</span>
              <span className="font-medium">{pkg.label} ({pkg.usersLabel})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray">Zahlung:</span>
              <span className="font-medium">Jahresabo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray">Listenpreis:</span>
              <span className="font-medium">{formatEuro(listPreis)} netto {preisLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray">An ADN fakturiert:</span>
              <span className="font-medium">{formatEuro(preisNetto)} netto {preisLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray">zzgl. MwSt. ({mwst.mwstSatz}%):</span>
              <span className="font-medium">{formatEuro(mwst.mwstBetrag)}</span>
            </div>
            <hr className="border-gray/20 my-2" />
            <div className="flex justify-between text-base font-bold">
              <span>Gesamt an ADN:</span>
              <span className="text-green">{formatEuro(mwst.preisBrutto)} brutto {preisLabel}</span>
            </div>
          </div>

          {mwst.reverseChargeHinweis && (
            <p className="text-xs text-green mt-3 bg-ice rounded-lg p-2">
              {mwst.reverseChargeHinweis}
            </p>
          )}

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
            disabled={formState === "loading"}
            className="w-full mt-6 py-4 bg-green hover:bg-green-d disabled:opacity-60 text-slate font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-base"
          >
            {formState === "loading" ? "Bestellung wird verarbeitet..." : "ADN-Bestellung anlegen"}
          </button>
        </div>
      </section>
    </form>
  );
}
