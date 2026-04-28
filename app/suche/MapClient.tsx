"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Partner {
  companyName: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface SearchResult extends Partner {
  distance: number;
}

function createGreenIcon() {
  return L.divIcon({
    className: "",
    html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#00C896"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

function partnerPopup(p: Partner): string {
  const lines: string[] = [];
  if (p.companyName) lines.push(`<strong style="color:#1A1A2E;font-size:14px;">${p.companyName}</strong>`);
  if (p.street) lines.push(`<span style="color:#6B6B8A;">${p.street}</span>`);
  if (p.zip || p.city) lines.push(`<span style="color:#6B6B8A;">${[p.zip, p.city].filter(Boolean).join(" ")}</span>`);
  if (p.website) {
    const url = p.website.startsWith("http") ? p.website : `https://${p.website}`;
    lines.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#00C896;text-decoration:none;">${p.website}</a>`);
  }
  return lines.join("<br/>");
}

export default function MapClient() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerCount, setPartnerCount] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [zipInput, setZipInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [50.5, 10.3],
      zoom: 6,
      scrollWheelZoom: true,
    });

    // Fit to DACH bounds: from Flensburg (54.8°N) to south of Switzerland (46°N)
    map.fitBounds([
      [54.9, 5.8],   // NW corner (north Germany, west border)
      [46.3, 17.2],  // SE corner (south Austria, east border)
    ]);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fetch partners
  useEffect(() => {
    fetch("/api/partners", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Partner[]) => {
        if (Array.isArray(data)) {
          setPartners(data);
          setPartnerCount(data.length);
        }
      })
      .catch(console.error);
  }, []);

  // Render markers
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();
    const icon = createGreenIcon();

    partners.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      L.marker([p.latitude, p.longitude], { icon })
        .bindPopup(partnerPopup(p))
        .addTo(markersRef.current!);
    });
  }, [partners]);

  const handleSearch = useCallback(async () => {
    const zip = zipInput.trim();
    if (!zip) return;
    setLoading(true);
    setError("");
    setSearchResults(null);

    try {
      const res = await fetch(
        `/api/partners/search?zip=${encodeURIComponent(zip)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Fehler bei der Suche");
        return;
      }
      setSearchResults(data.partners);
      if (mapRef.current && data.zipCoords) {
        mapRef.current.setView([data.zipCoords.latitude, data.zipCoords.longitude], 8);
      }
    } catch {
      setError("Fehler bei der Suche. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }, [zipInput]);

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      {/* Header */}
      <section style={{ background: "#1A1A2E", padding: "60px 24px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 4vw, 44px)",
              color: "#FFFFFF",
              marginBottom: 16,
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
            }}
          >
            Copilot-Berater in Ihrer Nähe
          </h1>
          <p style={{ color: "#6B6B8A", fontSize: "1.1rem", lineHeight: 1.7 }}>
            Finden Sie zertifizierte Microsoft Copilot Partner in Deutschland, Österreich und der Schweiz
          </p>
        </div>
      </section>

      {/* Search Bar */}
      <section style={{ background: "#FFFFFF", padding: "32px 24px 0", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            type="text"
            placeholder="PLZ eingeben..."
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{
              flex: 1,
              padding: "14px 20px",
              borderRadius: 10,
              border: "2px solid #E8E8F0",
              fontSize: "1rem",
              fontFamily: "'Figtree', system-ui, sans-serif",
              color: "#1A1A2E",
              outline: "none",
              transition: "border-color .2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#00C896")}
            onBlur={(e) => (e.target.style.borderColor = "#E8E8F0")}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              background: "#00C896",
              color: "#1A1A2E",
              fontWeight: 600,
              padding: "14px 28px",
              borderRadius: 10,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontFamily: "'Figtree', system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all .2s",
              opacity: loading ? 0.6 : 1,
            }}
          >
            🔍 Suchen
          </button>
        </div>
        {error && (
          <p style={{ color: "#e74c3c", marginTop: 12, fontSize: "0.9rem" }}>{error}</p>
        )}
      </section>

      {/* Map */}
      <section style={{ padding: "32px 24px", maxWidth: 1300, margin: "0 auto" }}>
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: "clamp(420px, 70vh, 820px)",
            maxWidth: 1240,
            margin: "0 auto",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #E8E8F0",
          }}
        />
      </section>

      {/* Search Results */}
      {searchResults && searchResults.length > 0 && (
        <section style={{ padding: "0 24px 40px", maxWidth: 1160, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {searchResults.map((p, i) => (
              <div
                key={i}
                style={{
                  background: "#EAF9F4",
                  border: "1px solid #E8E8F0",
                  borderRadius: 12,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <h3 style={{ color: "#1A1A2E", fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>
                  {p.companyName || "Unbekannt"}
                </h3>
                <p style={{ color: "#6B6B8A", margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>
                  {p.street && <>{p.street}<br /></>}
                  {[p.zip, p.city].filter(Boolean).join(" ")}
                </p>
                {p.website && (
                  <a
                    href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#00C896", textDecoration: "none", fontWeight: 500, fontSize: "0.95rem" }}
                  >
                    {p.website} →
                  </a>
                )}
                <span
                  style={{
                    display: "inline-block",
                    background: "#00C896",
                    color: "#1A1A2E",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    padding: "4px 12px",
                    borderRadius: 20,
                    alignSelf: "flex-start",
                    marginTop: 4,
                  }}
                >
                  ~{p.distance} km
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {searchResults && searchResults.length === 0 && (
        <section style={{ padding: "0 24px 40px", maxWidth: 1160, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#6B6B8A" }}>Keine Partner in der Nähe gefunden.</p>
        </section>
      )}

      {/* Counter */}
      <section style={{ padding: "20px 24px 60px", textAlign: "center" }}>
        <p style={{ color: "#6B6B8A", fontSize: "1.1rem" }}>
          Aktuell{" "}
          <span style={{ color: "#00C896", fontWeight: 700 }}>{partnerCount}</span>{" "}
          Partner im Netzwerk
        </p>
      </section>
    </div>
  );
}
