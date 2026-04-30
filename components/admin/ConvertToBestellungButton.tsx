"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, AlertTriangle, Check } from "lucide-react";
import type { AdnChannel } from "@prisma/client";
import { PACKAGES, type PaketKey, type Zahlungsmodell } from "@/lib/packages";
import { ADN_CHANNEL_CONFIG } from "@/lib/constants/lead-config";

type Confidence = "high" | "medium" | "low" | "ambiguous";

interface Evidence {
  source: "email" | "note-call" | "first-call-score" | "lead-notes";
  snippet: string;
  createdAt: string;
  paket: PaketKey | null;
  zahlungsmodell: Zahlungsmodell | null;
}

interface KlasseChoice {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  leadId: string;
  leadEmail: string;
  hasBestellung: boolean;
  paketHint: PaketKey | null;
  zahlungsmodellHint: Zahlungsmodell | null;
  confidence: Confidence;
  evidence: Evidence[];
  placeholders: string[];
  adnChannelHint: AdnChannel;
  klassen: KlasseChoice[];
  addressPreview: {
    firma: string | null;
    strasse: string | null;
    plz: string | null;
    ort: string | null;
    name: string | null;
  };
}

const SOURCE_LABEL: Record<Evidence["source"], string> = {
  email: "Kunden-Email",
  "note-call": "Notiz / Call",
  "first-call-score": "First-Call-Empfehlung",
  "lead-notes": "Lead-Notizen",
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "hohe Sicherheit",
  medium: "mittel",
  low: "niedrig",
  ambiguous: "uneindeutig",
};

const CONFIDENCE_CLASS: Record<Confidence, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-orange-100 text-orange-800",
  ambiguous: "bg-rose-100 text-rose-800",
};

export function ConvertToBestellungButton(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paket, setPaket] = useState<PaketKey | "">(props.paketHint ?? "");
  const [zahlungsmodell, setZahlungsmodell] = useState<Zahlungsmodell | "">(
    props.zahlungsmodellHint ?? ""
  );
  const [adnChannel, setAdnChannel] = useState<AdnChannel>(props.adnChannelHint ?? "NONE");
  const [klasseId, setKlasseId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (props.hasBestellung) {
    return (
      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-dark-slate-600">
          <Check className="w-4 h-4 text-emerald-600" />
          Bestellung im Onlineshop vorhanden (für {props.leadEmail}).
        </div>
      </div>
    );
  }

  async function submit() {
    if (!paket || !zahlungsmodell) {
      setError("Bitte Paket und Abrechnung wählen.");
      return;
    }
    if (!klasseId) {
      setError("Bitte Klasse explizit wählen.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${props.leadId}/bestellung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paket, zahlungsmodell, adnChannel, klasseId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Unbekannter Fehler.");
        setLoading(false);
        return;
      }
      setSuccess(`Bestellung ${json.bestellNr} angelegt.`);
      setLoading(false);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-dark-slate-900">Onlineshop-Bestellung</h3>
            <p className="text-xs text-dark-slate-500 mt-1">
              Lead retroaktiv als Bestellung in die Shop-Datenbank übernehmen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            In Onlineshop übernehmen
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full ${CONFIDENCE_CLASS[props.confidence]}`}>
            {CONFIDENCE_LABEL[props.confidence]}
          </span>
          {props.paketHint && (
            <span className="text-dark-slate-600">
              Vorschlag: <strong>{PACKAGES[props.paketHint].label}</strong>
              {props.zahlungsmodellHint
                ? ` / ${props.zahlungsmodellHint === "jahresabo" ? "jährlich" : "monatlich"}`
                : ""}
            </span>
          )}
          {!props.paketHint && (
            <span className="text-dark-slate-600">Keine automatische Erkennung — bitte manuell wählen.</span>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-slate-100">
              <h2 className="text-lg font-semibold text-dark-slate-900">
                Bestellung für {props.leadEmail} anlegen
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-dark-slate-400 hover:text-dark-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-dark-slate-900 mb-2">
                  Gefundene Hinweise
                </h3>
                {props.evidence.length === 0 ? (
                  <p className="text-sm text-dark-slate-500">
                    Keine Hinweise in Emails, Calls oder First-Call-Empfehlung gefunden.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {props.evidence.map((e, i) => (
                      <li
                        key={i}
                        className="text-xs border-l-2 border-dark-slate-200 pl-3 py-1"
                      >
                        <div className="font-medium text-dark-slate-700">
                          {SOURCE_LABEL[e.source]} · {e.createdAt.slice(0, 10)}
                          {e.paket && (
                            <span className="ml-2 text-emerald-700">
                              → {PACKAGES[e.paket].label}
                            </span>
                          )}
                          {e.zahlungsmodell && (
                            <span className="ml-2 text-emerald-700">
                              /{e.zahlungsmodell === "jahresabo" ? "jährlich" : "monatlich"}
                            </span>
                          )}
                        </div>
                        <div className="text-dark-slate-500 italic mt-0.5">{e.snippet}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <label className="block text-sm font-semibold text-dark-slate-900 mb-2">
                  Paket
                </label>
                <select
                  value={paket}
                  onChange={(e) => setPaket(e.target.value as PaketKey | "")}
                  className="w-full border border-dark-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— bitte wählen —</option>
                  {(Object.keys(PACKAGES) as PaketKey[]).map((k) => (
                    <option key={k} value={k}>
                      {PACKAGES[k].label} — {PACKAGES[k].users} User · ab {PACKAGES[k].monthly} €/Monat
                    </option>
                  ))}
                </select>
              </section>

              <section>
                <label className="block text-sm font-semibold text-dark-slate-900 mb-2">
                  Abrechnung
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="abo"
                      value="jahresabo"
                      checked={zahlungsmodell === "jahresabo"}
                      onChange={() => setZahlungsmodell("jahresabo")}
                    />
                    Jährlich
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="abo"
                      value="monatlich"
                      checked={zahlungsmodell === "monatlich"}
                      onChange={() => setZahlungsmodell("monatlich")}
                    />
                    Monatlich
                  </label>
                </div>
              </section>

              <section>
                <label className="block text-sm font-semibold text-dark-slate-900 mb-2">
                  ADN-Kanal
                </label>
                <select
                  value={adnChannel}
                  onChange={(e) => setAdnChannel(e.target.value as AdnChannel)}
                  className="w-full border border-dark-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  {Object.entries(ADN_CHANNEL_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-dark-slate-500 mt-1">
                  {ADN_CHANNEL_CONFIG[adnChannel].description}
                </p>
              </section>

              <section>
                <label className="block text-sm font-semibold text-dark-slate-900 mb-2">
                  Klasse *
                </label>
                <select
                  value={klasseId}
                  onChange={(e) => setKlasseId(e.target.value)}
                  className="w-full border border-dark-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— bitte wählen —</option>
                  {props.klassen.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-dark-slate-900 mb-2">Rechnungsdaten</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <AddrField label="Name" value={props.addressPreview.name} />
                  <AddrField label="Firma" value={props.addressPreview.firma} />
                  <AddrField label="Straße" value={props.addressPreview.strasse} />
                  <AddrField label="PLZ" value={props.addressPreview.plz} />
                  <AddrField label="Ort" value={props.addressPreview.ort} />
                </div>
                {props.placeholders.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Fehlende Felder werden mit &bdquo;&mdash;&ldquo; gespeichert: {props.placeholders.join(", ")}.
                      Bitte später in der Bestelldetail-Ansicht ergänzen.
                    </span>
                  </div>
                )}
              </section>

              {error && (
                <div className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  {success}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-dark-slate-100">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-dark-slate-600 hover:bg-dark-slate-50 rounded-lg"
                disabled={loading}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={loading || !paket || !zahlungsmodell || !klasseId}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg disabled:opacity-50"
              >
                {loading ? "Lege an…" : "Bestellung anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AddrField({ label, value }: { label: string; value: string | null }) {
  const isPlaceholder = !value || value.trim().length === 0;
  return (
    <div>
      <div className="text-xs text-dark-slate-400">{label}</div>
      <div className={isPlaceholder ? "text-rose-600 italic" : "text-dark-slate-800"}>
        {isPlaceholder ? "— (Platzhalter)" : value}
      </div>
    </div>
  );
}
